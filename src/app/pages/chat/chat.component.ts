import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, NgIf, NgFor, NgClass, DatePipe, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { AuthService, User } from '../../services/auth.service';
import { Message } from '../../models/message.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIf, NgFor, NgClass, DatePipe],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy {
  messages: Message[] = [];
  newMessage = '';
  receiverId: string | null = null;
  receiverName = 'Organization';
  opportunityId: string | null = null;
  currentUser: User | null = null;
  isPartnerOnline = false;
  lastSeen: string | null = null;
  showOptions = false;
  selectedMessageForDelete: Message | null = null;
  showDeleteMenu = false;
  isSending = false;
  
  // Camera variables
  showCamera = false;
  private cameraStream: MediaStream | null = null;

  private chatSub: Subscription | null = null;
  private statusSub: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private authService: AuthService,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    
    this.route.queryParamMap.subscribe(qparams => {
      this.opportunityId = qparams.get('opportunityId');
    });

    this.route.paramMap.subscribe(params => {
      this.receiverId = params.get('userId');
      const nameParam = params.get('name');
      
      if (nameParam) {
        this.receiverName = nameParam;
      } else if (this.receiverId) {
        this.authService.getUserById(this.receiverId).subscribe({
          next: (user: User) => {
            if (user && user.name) this.receiverName = user.name;
            this.isPartnerOnline = !!user.isOnline;
            if (user.lastActive) {
              this.lastSeen = this.formatLastSeen(user.lastActive);
            }
          },
          error: (err: any) => {
            console.error('Error fetching receiver info:', err);
            this.receiverName = 'User'; // Fallback
          }
        });
      }

      if (this.currentUser && this.receiverId) {
        // Mark as read when opening chat
        this.chatService.markMessagesAsRead(this.receiverId, this.opportunityId || undefined);

        // Trigger initial load of history
        this.chatService.getChatMessages(this.currentUser.id, this.receiverId, this.opportunityId || undefined).subscribe();
      }
    });

    this.chatSub = this.chatService.messages$.subscribe(messages => {
      this.messages = messages;
      this.scrollToBottom();
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
    this.location.back();
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
    this.stopCamera();
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

  handleFileUpload(event: any, type: 'image' | 'audio'): void {
    const file = event.target.files[0];
    if (file && this.receiverId) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const mediaUrl = e.target.result;
        const displayName = type === 'image' ? 'Photo' : 'Audio';
        this.chatService.sendMessage(this.receiverId!, `Shared a ${displayName}`, type, mediaUrl);
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
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg');
        
        // Send the captured photo
        if (this.receiverId) {
          this.chatService.sendMessage(this.receiverId, 'Shared a photo', 'image', imageData);
        }
        
        this.stopCamera();
      }
    }
  }

  private scrollToBottom(): void {
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
}
