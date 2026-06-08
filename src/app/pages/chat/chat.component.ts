import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule, NgIf, NgFor, NgClass, DatePipe, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { AuthService, User } from '../../services/auth.service';
import { Message } from '../../models/message.model';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeResourceUrl, SafeUrl } from '@angular/platform-browser';
import { ApplicationService } from '../../services/application.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIf, NgFor, NgClass, DatePipe],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy {
  @Input() isEmbedded = false;
  
  messages: Message[] = [];
  newMessage = '';
  isMessagingAllowed = true;
  permissionCheckLoading = false;
  receiverId: string | null = null;
  receiverName = 'Organization';
  opportunityId: string | null = null;
  currentUser: User | null = null;
  isPartnerOnline = false;
  lastSeen: string | null = null;
  
  // Conversations list & layout state
  conversations: any[] = [];
  searchQuery = '';
  isMobileView = false;
  isBrowser = false;
  isChatLoading = false;
  showOptions = false;
  selectedMessageForDelete: Message | null = null;
  showDeleteMenu = false;
  isSending = false;
  chatWallpaper: string | null = null;
  
  // Camera variables
  showCamera = false;
  private cameraStream: MediaStream | null = null;

  // Voice Recording variables
  isRecording = false;
  recordingDuration = 0;
  private mediaRecorder: any = null;
  private audioChunks: Blob[] = [];
  private recordingTimer: any = null;

  // Live Location variable
  isLiveLocationSharing = false;
  private liveLocationInterval: any = null;

  // Location Picker Modal variables
  showLocationPicker = false;
  isPickingLiveLocation = false;
  pickerCoordinates: { lat: number; lng: number } | null = null;
  private pickerMapInstance: any = null;
  private pickerMarkerInstance: any = null;

  // Calling variables
  activeCall: 'audio' | 'video' | null = null;
  callState: 'calling' | 'connected' | null = null;
  isCallMuted = false;
  isCallVideoOff = false;
  callDuration = 0;
  private callStream: MediaStream | null = null;
  private callTimer: any = null;

  // Custom Audio playback state
  audioPlaying: { [msgId: string]: boolean } = {};
  audioCurrentTimes: { [msgId: string]: number } = {};
  audioDurations: { [msgId: string]: number } = {};
  audioSpeeds: { [msgId: string]: number } = {};

  private chatSub: Subscription | null = null;
  private statusSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private authService: AuthService,
    private router: Router,
    private location: Location,
    private sanitizer: DomSanitizer,
    private applicationService: ApplicationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.isBrowser = typeof window !== 'undefined';

    if (this.isBrowser) {
      this.isMobileView = window.innerWidth < 768;
      this.chatWallpaper = localStorage.getItem('chat_wallpaper') || null;
      window.addEventListener('resize', () => {
        this.isMobileView = window.innerWidth < 768;
      });
    }

    // Load initial conversations list
    this.loadConversations();
    
    this.route.queryParamMap.subscribe(qparams => {
      this.opportunityId = qparams.get('opportunityId');
      
      const pId = qparams.get('partnerId');
      const pName = qparams.get('partnerName');
      if (pId) {
        this.selectConversation(pId, pName || 'User', this.opportunityId || undefined);
      }
    });

    this.route.paramMap.subscribe(params => {
      const uId = params.get('userId');
      const nameParam = params.get('name');
      
      if (uId) {
        this.receiverId = uId;
        if (nameParam) {
          this.receiverName = nameParam;
        } else {
          this.authService.getUserById(uId).subscribe({
            next: (user: User) => {
              if (user && user.name) this.receiverName = user.name;
              this.isPartnerOnline = !!user.isOnline;
              if (user.lastActive) {
                this.lastSeen = this.formatLastSeen(user.lastActive);
              }
            },
            error: (err: any) => {
              console.error('Error fetching receiver info:', err);
              this.receiverName = 'User';
            }
          });
        }

        if (this.currentUser) {
          this.chatService.markMessagesAsRead(uId, this.opportunityId || undefined);
          this.chatService.getChatMessages(this.currentUser.id, uId, this.opportunityId || undefined).subscribe();
          this.checkMessagingPermission(uId);
        }
      }
    });

    this.chatSub = this.chatService.messages$.subscribe(messages => {
      this.messages = messages;
      this.scrollToBottom();
      this.loadConversations();
    });

    this.statusSub = this.chatService.userStatus$.subscribe(status => {
      if (status && status.userId === this.receiverId) {
        this.isPartnerOnline = status.isOnline;
        if (status.lastActive) {
          this.lastSeen = this.formatLastSeen(status.lastActive);
        }
      }
    });
  }

  goBack(): void {
    if (this.isEmbedded) {
      this.goToDashboard();
      return;
    }
    if (this.currentUser) {
      const role = this.currentUser.role;
      if (role === 'Volunteer') {
        this.router.navigate(['/volunteer/messages']);
      } else if (role === 'Citizen' || role === 'User') {
        this.router.navigate(['/citizen/messages']);
      } else if (role === 'Admin') {
        this.router.navigate(['/admin'], { queryParams: { tab: 'messages' } });
      } else {
        this.location.back();
      }
    } else {
      this.location.back();
    }
  }

  goToDashboard(): void {
    if (this.currentUser) {
      const role = this.currentUser.role;
      if (role === 'Volunteer') {
        this.router.navigate(['/volunteer/dashboard']);
      } else if (role === 'Citizen' || role === 'User') {
        this.router.navigate(['/citizen/dashboard']);
      } else if (role === 'Admin') {
        this.router.navigate(['/admin']);
      } else if (role === 'NGO') {
        this.router.navigate(['/opportunities']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy(): void {
    if (this.chatSub) this.chatSub.unsubscribe();
    if (this.statusSub) this.statusSub.unsubscribe();
    if (this.liveLocationInterval) clearInterval(this.liveLocationInterval);
    this.stopCamera();
    this.endCall();
  }

  formatLastSeen(date: Date | string): string {
    const d = new Date(date);
    return `Last seen ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  onSendMessage(): void {
    if (this.newMessage.trim() && this.receiverId && !this.isSending) {
      this.isSending = true;
      this.chatService.sendMessage(this.receiverId, this.newMessage, 'text', undefined, this.opportunityId || undefined);
      this.newMessage = '';
      this.showOptions = false;
      // Reset sending flag after a short delay or when service completes (service doesn't return observable currently)
      setTimeout(() => this.isSending = false, 500);
    }
  }

  toggleOptions(): void {
    this.showOptions = !this.showOptions;
  }

  // --- Emojis, Audio, Location ---
  showEmojiPicker = false;
  selectedEmojiCategory = 0;
  emojiCategories = [
    { name: 'Smileys', list: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚'] },
    { name: 'Gestures', list: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '👌', '👈', '👉', '👋', '👏', '🙌', '🙏', '💪'] },
    { name: 'Fun & Eco', list: ['❤️', '🔥', '✨', '🎉', '🗑️', '♻️', '🌱', '🌍', '🏠', '🚗', '📞', '💡', '🔔', '💬', '✅'] }
  ];

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  selectEmojiCategory(idx: number): void {
    this.selectedEmojiCategory = idx;
  }

  addEmoji(emoji: string): void {
    this.newMessage += emoji;
  }

  shareLocation(): void {
    this.openLocationPicker(false);
  }

  shareLiveLocation(): void {
    this.openLocationPicker(true);
  }

  openLocationPicker(isLive: boolean): void {
    this.showLocationPicker = true;
    this.isPickingLiveLocation = isLive;
    this.showOptions = false;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          this.pickerCoordinates = { lat, lng };
          setTimeout(() => {
            this.initPickerMap(lat, lng);
          }, 100);
        },
        (error) => {
          console.error('Error getting location for picker:', error);
          // Fallback Chennai coordinates
          const lat = 13.0827;
          const lng = 80.2707;
          this.pickerCoordinates = { lat, lng };
          setTimeout(() => {
            this.initPickerMap(lat, lng);
          }, 100);
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  }

  async initPickerMap(lat: number, lng: number): Promise<void> {
    if (!this.isBrowser) return;
    try {
      const L = await import('leaflet');
      
      if (this.pickerMapInstance) {
        this.pickerMapInstance.remove();
        this.pickerMapInstance = null;
      }
      
      this.pickerMapInstance = L.map('pickerMap').setView([lat, lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(this.pickerMapInstance);
      
      this.pickerMarkerInstance = L.marker([lat, lng], { draggable: true }).addTo(this.pickerMapInstance);
      
      this.pickerMarkerInstance.on('dragend', () => {
        const pos = this.pickerMarkerInstance.getLatLng();
        this.pickerCoordinates = { lat: pos.lat, lng: pos.lng };
      });
      
      this.pickerMapInstance.on('click', (e: any) => {
        const pos = e.latlng;
        this.pickerMarkerInstance.setLatLng(pos);
        this.pickerCoordinates = { lat: pos.lat, lng: pos.lng };
      });
    } catch (err) {
      console.error('Error initializing Leaflet map:', err);
    }
  }

  closeLocationPicker(): void {
    this.showLocationPicker = false;
    if (this.pickerMapInstance) {
      this.pickerMapInstance.remove();
      this.pickerMapInstance = null;
    }
    this.pickerCoordinates = null;
  }

  confirmLocationShare(): void {
    if (!this.receiverId || !this.pickerCoordinates) return;
    
    const lat = this.pickerCoordinates.lat;
    const lng = this.pickerCoordinates.lng;
    const locationUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    
    if (this.isPickingLiveLocation) {
      this.isLiveLocationSharing = true;
      this.chatService.sendMessage(
        this.receiverId,
        '📡 Started sharing Live Location',
        'live-location',
        locationUrl,
        this.opportunityId || undefined,
        (msg) => {
          const messageId = msg.id;
          if (this.liveLocationInterval) clearInterval(this.liveLocationInterval);
          this.liveLocationInterval = setInterval(() => {
            if (navigator.geolocation && this.isLiveLocationSharing && this.receiverId) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const newLat = pos.coords.latitude;
                  const newLng = pos.coords.longitude;
                  this.chatService.updateLiveLocation(messageId, newLat, newLng);
                },
                (err) => console.error('Error tracking live location:', err)
              );
            }
          }, 10000);
        }
      );
    } else {
      this.chatService.sendMessage(
        this.receiverId,
        '📍 Shared a location',
        'location',
        locationUrl,
        this.opportunityId || undefined
      );
    }
    
    this.closeLocationPicker();
  }

  getSafeUrl(url: string | undefined): SafeUrl {
    if (!url) return '';
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }

  getSafeLocationUrl(url: string | undefined): SafeResourceUrl {
    if (!url) return this.sanitizer.bypassSecurityTrustResourceUrl('');
    let embedUrl = url;
    if (url.includes('google.com/maps?q=')) {
      embedUrl = url.replace('google.com/maps?q=', 'maps.google.com/maps?q=');
      if (!embedUrl.includes('&output=embed')) {
        embedUrl += '&z=15&output=embed';
      }
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  stopLiveLocationSharing(): void {
    this.isLiveLocationSharing = false;
    if (this.liveLocationInterval) {
      clearInterval(this.liveLocationInterval);
      this.liveLocationInterval = null;
    }
    if (this.receiverId) {
      this.chatService.sendMessage(this.receiverId!, '🛑 Stopped live location sharing', 'text', undefined, this.opportunityId || undefined);
    }
  }

  handleDocumentUpload(event: any): void {
    const file = event.target.files[0];
    if (file && this.receiverId) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const mediaUrl = e.target.result;
        this.chatService.sendMessage(this.receiverId!, `📄 ${file.name}`, 'document', mediaUrl, this.opportunityId || undefined);
        this.showOptions = false;
      };
      reader.readAsDataURL(file);
    }
  }

  async startRecording(): Promise<void> {
    try {
      this.isRecording = true;
      this.recordingDuration = 0;
      this.audioChunks = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new (window as any).MediaRecorder(stream);
      
      this.mediaRecorder.ondataavailable = (event: any) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      
      this.recordingTimer = setInterval(() => {
        this.recordingDuration++;
      }, 1000);
    } catch (err) {
      console.error('Error starting audio recording:', err);
      alert('Could not access microphone. Please check permissions.');
      this.isRecording = false;
    }
  }

  stopRecording(send: boolean): void {
    if (!this.mediaRecorder || !this.isRecording) return;
    
    clearInterval(this.recordingTimer);
    this.isRecording = false;

    this.mediaRecorder.onstop = () => {
      if (send && this.audioChunks.length > 0 && this.receiverId) {
        const mimeType = this.mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        const reader = new FileReader();
        reader.onload = (e: any) => {
          const mediaUrl = e.target.result;
          this.chatService.sendMessage(this.receiverId!, '🎙️ Audio note', 'audio', mediaUrl, this.opportunityId || undefined);
        };
        reader.readAsDataURL(audioBlob);
      }
      
      if (this.mediaRecorder && this.mediaRecorder.stream) {
        this.mediaRecorder.stream.getTracks().forEach((track: any) => track.stop());
      }
      this.mediaRecorder = null;
      this.audioChunks = [];
    };

    this.mediaRecorder.stop();
  }

  formatDuration(seconds: number): string {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  }

  handleFileUpload(event: any, type: 'image' | 'audio'): void {
    const file = event.target.files[0];
    if (file && this.receiverId) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const mediaUrl = e.target.result;
        const displayName = type === 'image' ? 'Photo' : 'Audio';
        this.chatService.sendMessage(this.receiverId!, `Shared a ${displayName}`, type, mediaUrl, this.opportunityId || undefined);
        this.showOptions = false;
      };
      reader.readAsDataURL(file);
    }
  }

  onSharePhoto(): void {
    this.startCamera();
    this.showOptions = false;
  }

  async startCamera(): Promise<void> {
    try {
      this.showCamera = true;
      this.cameraStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      
      setTimeout(() => {
        const videoElement = document.querySelector('#cameraPreview') as HTMLVideoElement;
        if (videoElement && this.cameraStream) {
          videoElement.srcObject = this.cameraStream;
        }
      }, 300);
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Could not access camera. Please check permissions.');
      this.showCamera = false;
    }
  }

  stopCamera(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    this.showCamera = false;
  }

  capturePhoto(): void {
    const video = document.querySelector('#cameraPreview') as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    if (video) {
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg');
        
        // Send the captured photo
        if (this.receiverId) {
          this.chatService.sendMessage(this.receiverId, 'Shared a photo', 'image', imageData, this.opportunityId || undefined);
        }
        
        this.stopCamera();
      }
    }
  }

  private scrollToBottom(): void {
    if (!this.isBrowser) return;
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  openDeleteOptions(event: Event, msg: Message): void {
    event.preventDefault();
    event.stopPropagation();
    if (msg.isDeletedForEveryone) return;
    this.selectedMessageForDelete = msg;
    this.showDeleteMenu = true;
  }

  closeDeleteMenu(): void {
    this.showDeleteMenu = false;
    this.selectedMessageForDelete = null;
  }

  onDeleteMessage(type: 'me' | 'everyone'): void {
    if (this.selectedMessageForDelete) {
      this.chatService.deleteMessage(this.selectedMessageForDelete.id, type);
      this.closeDeleteMenu();
    }
  }

  isMessageDeletedForMe(msg: Message): boolean {
    return !!(msg.deletedFor && this.currentUser && msg.deletedFor.includes(this.currentUser.id));
  }

  async startCall(type: 'audio' | 'video'): Promise<void> {
    try {
      this.activeCall = type;
      this.callState = 'calling';
      this.callDuration = 0;
      this.isCallMuted = false;
      this.isCallVideoOff = false;

      // Ask for media stream
      this.callStream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      });

      // Simulate connection after 2 seconds
      setTimeout(() => {
        if (this.activeCall) {
          this.callState = 'connected';
          this.startCallTimer();
          
          // Map stream to HTML video elements
          setTimeout(() => {
            const localVideo = document.querySelector('#localVideo') as HTMLVideoElement;
            const remoteVideo = document.querySelector('#remoteVideo') as HTMLVideoElement;
            if (localVideo && this.callStream) {
              localVideo.srcObject = this.callStream;
            }
            if (remoteVideo && this.callStream && type === 'video') {
              remoteVideo.srcObject = this.callStream;
            }
          }, 300);
        }
      }, 2000);

    } catch (err) {
      console.error('Error starting call:', err);
      alert('Could not start call: Check camera/microphone permissions.');
      this.endCall();
    }
  }

  startCallTimer(): void {
    if (this.callTimer) clearInterval(this.callTimer);
    this.callTimer = setInterval(() => {
      this.callDuration++;
    }, 1000);
  }

  toggleCallMute(): void {
    this.isCallMuted = !this.isCallMuted;
    if (this.callStream) {
      this.callStream.getAudioTracks().forEach(track => track.enabled = !this.isCallMuted);
    }
  }

  toggleCallVideo(): void {
    this.isCallVideoOff = !this.isCallVideoOff;
    if (this.callStream) {
      this.callStream.getVideoTracks().forEach(track => track.enabled = !this.isCallVideoOff);
    }
  }

  endCall(): void {
    if (this.callStream) {
      this.callStream.getTracks().forEach(track => track.stop());
      this.callStream = null;
    }
    if (this.callTimer) {
      clearInterval(this.callTimer);
      this.callTimer = null;
    }
    this.activeCall = null;
    this.callState = null;
    this.callDuration = 0;
  }

  // --- WhatsApp Custom Audio Voice Note Methods ---
  getAudioEl(msg: Message): HTMLAudioElement | null {
    if (typeof document === 'undefined') return null;
    const el = document.getElementById('audio-el-' + msg.id) as HTMLAudioElement;
    return el;
  }

  toggleAudioPlay(msg: Message): void {
    const audio = this.getAudioEl(msg);
    if (!audio) return;

    // Pause all other playing audio notes first
    Object.keys(this.audioPlaying).forEach(id => {
      if (id !== msg.id && this.audioPlaying[id]) {
        const otherAudio = document.getElementById('audio-el-' + id) as HTMLAudioElement;
        if (otherAudio) {
          otherAudio.pause();
          this.audioPlaying[id] = false;
        }
      }
    });

    if (this.audioPlaying[msg.id]) {
      audio.pause();
      this.audioPlaying[msg.id] = false;
    } else {
      // Set playback speed
      audio.playbackRate = this.audioSpeeds[msg.id] || 1;
      audio.play().then(() => {
        this.audioPlaying[msg.id] = true;
      }).catch(err => {
        console.error('Error playing audio:', err);
      });
    }
  }

  isAudioPlaying(msg: Message): boolean {
    return !!this.audioPlaying[msg.id];
  }

  getAudioCurrentProgress(msg: Message): number {
    const duration = this.audioDurations[msg.id] || 0;
    const currentTime = this.audioCurrentTimes[msg.id] || 0;
    if (!duration) return 0;
    return (currentTime / duration) * 100;
  }

  onAudioSliderChange(event: any, msg: Message): void {
    const audio = this.getAudioEl(msg);
    if (!audio) return;
    const progress = event.target.value;
    const duration = this.audioDurations[msg.id] || 0;
    audio.currentTime = (progress / 100) * duration;
    this.audioCurrentTimes[msg.id] = audio.currentTime;
  }

  onAudioTimeUpdate(msg: Message): void {
    const audio = this.getAudioEl(msg);
    if (audio) {
      this.audioCurrentTimes[msg.id] = audio.currentTime;
    }
  }

  onAudioEnded(msg: Message): void {
    this.audioPlaying[msg.id] = false;
    this.audioCurrentTimes[msg.id] = 0;
    const audio = this.getAudioEl(msg);
    if (audio) audio.currentTime = 0;
  }

  onAudioMetadataLoaded(event: any, msg: Message): void {
    const audio = event.target as HTMLAudioElement;
    if (audio) {
      this.audioDurations[msg.id] = audio.duration;
      this.audioCurrentTimes[msg.id] = audio.currentTime;
      if (!this.audioSpeeds[msg.id]) {
        this.audioSpeeds[msg.id] = 1;
      }
    }
  }

  getAudioCurrentTimeFormatted(msg: Message): string {
    const duration = this.audioDurations[msg.id] || 0;
    const currentTime = this.audioCurrentTimes[msg.id] || 0;
    const displayTime = currentTime > 0 ? currentTime : duration;
    return this.formatDuration(Math.round(displayTime));
  }

  toggleAudioSpeed(msg: Message): void {
    const audio = this.getAudioEl(msg);
    const speeds = [1, 1.5, 2];
    const currentSpeed = this.audioSpeeds[msg.id] || 1;
    let nextIndex = speeds.indexOf(currentSpeed) + 1;
    if (nextIndex >= speeds.length) nextIndex = 0;
    const newSpeed = speeds[nextIndex];
    this.audioSpeeds[msg.id] = newSpeed;
    if (audio) {
      audio.playbackRate = newSpeed;
    }
  }

  getAudioPlaybackSpeed(msg: Message): number {
    return this.audioSpeeds[msg.id] || 1;
  }

  // --- Conversations Split-Screen Helper Methods ---
  loadConversations(): void {
    this.chatService.getConversations().subscribe({
      next: (convs) => {
        this.conversations = convs;
      },
      error: (err) => console.error('Error loading conversations:', err)
    });
  }

  getFilteredConversations(): any[] {
    if (!this.searchQuery.trim()) {
      return this.conversations;
    }
    const q = this.searchQuery.toLowerCase();
    return this.conversations.filter(c => 
      c.partnerName.toLowerCase().includes(q) || 
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
    );
  }

  selectConversation(partnerId: string, partnerName: string, opportunityId?: string): void {
    this.receiverId = partnerId;
    this.receiverName = partnerName;
    this.opportunityId = opportunityId || null;

    if (this.currentUser) {
      this.chatService.markMessagesAsRead(partnerId, opportunityId);
      this.isChatLoading = true;
      this.chatService.getChatMessages(this.currentUser.id, partnerId, opportunityId).subscribe({
        next: (msgs) => {
          this.messages = msgs;
          this.isChatLoading = false;
          this.scrollToBottom();
        },
        error: (err) => {
          console.error('Error loading chat messages:', err);
          this.isChatLoading = false;
        }
      });
      
      this.checkMessagingPermission(partnerId);
      
      this.authService.getUserById(partnerId).subscribe({
        next: (user: User) => {
          this.isPartnerOnline = !!user.isOnline;
          if (user.lastActive) {
            this.lastSeen = this.formatLastSeen(user.lastActive);
          }
        },
        error: (err) => console.error('Error getting status:', err)
      });
    }
  }

  closeActiveChat(): void {
    this.receiverId = null;
    this.messages = [];
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { partnerId: null, partnerName: null, opportunityId: null },
      queryParamsHandling: 'merge'
    });
  }

  clearChat(): void {
    if (!this.receiverId) return;
    const confirmClear = confirm('Are you sure you want to clear this entire conversation? All messages will be deleted from your view. This action cannot be undone.');
    if (confirmClear) {
      this.chatService.clearConversation(this.receiverId, this.opportunityId || undefined);
    }
  }

  handleWallpaperUpload(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.chatWallpaper = e.target.result;
        if (this.isBrowser) localStorage.setItem('chat_wallpaper', this.chatWallpaper!);
      };
      reader.readAsDataURL(file);
    }
  }

  removeWallpaper(): void {
    this.chatWallpaper = null;
    if (this.isBrowser) localStorage.removeItem('chat_wallpaper');
  }

  checkMessagingPermission(partnerId: string): void {
    if (!this.currentUser || this.currentUser.role !== 'Volunteer') {
      this.isMessagingAllowed = true;
      return;
    }

    this.permissionCheckLoading = true;
    this.authService.getUserById(partnerId).subscribe({
      next: (partner: User) => {
        if (partner.role === 'NGO' || partner.role === 'Admin') {
          this.applicationService.getVolunteerApplications().subscribe({
            next: (res: any) => {
              const apps = res.applications || (Array.isArray(res) ? res : []);
              const hasAcceptedApp = apps.some((app: any) => {
                const appStatus = app.status;
                const opp = app.opportunity_id;
                if (!opp) return false;
                const ngoId = opp.ngo_id?._id || opp.ngo_id?.id || opp.ngo_id;
                return appStatus === 'accepted' && ngoId === partnerId;
              });

              this.isMessagingAllowed = hasAcceptedApp;
              this.permissionCheckLoading = false;
            },
            error: (err: any) => {
              console.error('Error fetching volunteer applications:', err);
              this.isMessagingAllowed = false;
              this.permissionCheckLoading = false;
            }
          });
        } else {
          // If citizen/other, allowed
          this.isMessagingAllowed = true;
          this.permissionCheckLoading = false;
        }
      },
      error: (err: any) => {
        console.error('Error fetching partner user details:', err);
        this.isMessagingAllowed = true;
        this.permissionCheckLoading = false;
      }
    });
  }
}
