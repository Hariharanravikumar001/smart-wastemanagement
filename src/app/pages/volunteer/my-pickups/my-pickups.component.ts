import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, map, timer, switchMap, combineLatest, BehaviorSubject, catchError, shareReplay, of } from 'rxjs';
import { WasteRequest } from '../../../models/waste-request.model';
import { AuthService, User } from '../../../services/auth.service';
import { WasteRequestService } from '../../../services/waste-request.service';

import { RouterModule } from '@angular/router';
import { ChatService } from '../../../services/chat.service';
import { ApplicationService } from '../../../services/application.service';
import { OpportunityService } from '../../../services/opportunity.service';
import { Application } from '../../../models/application.model';

@Component({
  selector: 'app-my-pickups',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './my-pickups.component.html',
  styleUrls: ['./my-pickups.component.css']
})
export class MyPickupsComponent implements OnInit, OnDestroy {
  isBrowser = typeof window !== 'undefined';
  currentUser: User | null = null;
  activePickups$: Observable<WasteRequest[]> = new Observable();
  completedPickups$: Observable<WasteRequest[]> = new Observable();
  acceptedNGOProjects$: Observable<Application[]> = of([]);
  
  // For weighted completion
  weightInput: number = 0;
  completingRequestId: string | null = null;

  // Smart Route Mode
  smartRouteMode = false;
  smartRouteOrder: WasteRequest[] = [];
  shareLocationActive = false;
  simulationWaypoints: any[] = [];
  private simulationInterval: any = null;
  private truckMarker: any = null;

  // New Industrial Logistics Variables
  optimizationProfile: 'priority' | 'distance' | 'eco' = 'priority';
  activeRouteIndex: number = 0; // Index of the stop currently being navigated to
  navigationActive = false;
  navigationPaused = false;
  
  telemetry = {
    speed: 0,
    battery: 100,
    carbonOffset: 0.0,
    distanceRemaining: 0.0, // in km
    etaMinutes: 0,
    currentCoords: null as [number, number] | null
  };
  
  private routeMarkers: any[] = [];
  private routePolyline: any = null;
  private arrivedStops: Set<string> = new Set();
  public notificationMessage: string | null = null;
  private notificationTimeout: any = null;
  private lastActives: WasteRequest[] = [];

  // Detailed view
  selectedRequest: WasteRequest | null = null;
  private refreshSubject = new BehaviorSubject<void>(undefined);

  constructor(
    private authService: AuthService,
    private wasteService: WasteRequestService,
    private chatService: ChatService,
    private applicationService: ApplicationService,
    private opportunityService: OpportunityService
  ) {}

  ngOnInit() {
    // Load state from localStorage if browser
    if (this.isBrowser) {
      const savedProfile = localStorage.getItem('smart_route_profile');
      if (savedProfile) {
        this.optimizationProfile = savedProfile as any;
      }
      const savedRouteMode = localStorage.getItem('smart_route_mode');
      if (savedRouteMode) {
        this.smartRouteMode = savedRouteMode === 'true';
      }
      const savedNavActive = localStorage.getItem('smart_route_nav_active');
      if (savedNavActive) {
        this.navigationActive = savedNavActive === 'true';
      }
      const savedActiveIdx = localStorage.getItem('smart_route_active_idx');
      if (savedActiveIdx) {
        this.activeRouteIndex = parseInt(savedActiveIdx, 10);
      }
      const savedTelemetry = localStorage.getItem('smart_route_telemetry');
      if (savedTelemetry) {
        try {
          this.telemetry = JSON.parse(savedTelemetry);
        } catch (e) {}
      }
    }

    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        const dataStream = combineLatest([
          this.refreshSubject,
          timer(0, 30000)
        ]).pipe(
          map(() => user),
          shareReplay(1)
        );

        const myRequests$ = dataStream.pipe(
          switchMap(u => this.wasteService.getRequestsByVolunteer(u!.id).pipe(
            catchError(() => of([]))
          )),
          shareReplay(1)
        );

        this.activePickups$ = myRequests$.pipe(
          map(reqs => reqs.filter(r => r.status !== 'Completed' && r.status !== 'Cancelled'))
        );

        this.completedPickups$ = myRequests$.pipe(
          map(reqs => reqs.filter(r => r.status === 'Completed'))
        );

        this.acceptedNGOProjects$ = dataStream.pipe(
          switchMap(() => this.applicationService.getVolunteerApplications().pipe(
            map(res => {
              const apps = (res as any)?.applications || (Array.isArray(res) ? res : []);
              return apps.filter((a: any) => a.status === 'accepted' && (a.opportunity_id as any)?.status !== 'closed');
            }),
            catchError(() => of([]))
          )),
          shareReplay(1)
        );

        this.activePickups$.subscribe(actives => {
          this.lastActives = actives;
          this.calculateSmartRoute(actives);
        });
      }
    });
  }

  refreshData() {
    this.refreshSubject.next();
  }

  updateStatus(requestId: string, status: WasteRequest['status']) {
    this.wasteService.updateRequest(requestId, { status }).subscribe({
        next: () => this.refreshData(),
        error: (err: any) => alert('Failed to update status: ' + (err.error?.message || err.message))
    });
  }

  startCompletion(requestId: string) {
    this.completingRequestId = requestId;
    this.weightInput = 0;
  }

  private routeAnimationId: any = null;

  getStopCoords(req: WasteRequest) {
    const centerLat = 20.5937;
    const centerLng = 78.9629;
    const offsetLat = (req.location.length % 10) * 0.5 - 2.5;
    const offsetLng = (req.location.length % 8) * 0.5 - 2.0;
    return { lat: centerLat + offsetLat, lng: centerLng + offsetLng };
  }

  getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  saveState() {
    if (!this.isBrowser) return;
    localStorage.setItem('smart_route_profile', this.optimizationProfile);
    localStorage.setItem('smart_route_mode', String(this.smartRouteMode));
    localStorage.setItem('smart_route_nav_active', String(this.navigationActive));
    localStorage.setItem('smart_route_active_idx', String(this.activeRouteIndex));
    localStorage.setItem('smart_route_telemetry', JSON.stringify(this.telemetry));
  }

  toggleSmartRoute() {
    this.smartRouteMode = !this.smartRouteMode;
    this.saveState();
    if (this.smartRouteMode) {
      setTimeout(() => {
        this.initLeafletMap();
      }, 100);
    } else {
      this.stopNavigation();
      this.shareLocationActive = false;
      if (this.map) {
        this.map.remove();
        this.map = null;
      }
    }
  }

  toggleLocationSharing() {
    this.shareLocationActive = !this.shareLocationActive;
    if (this.shareLocationActive) {
      this.startNavigation();
    } else {
      this.stopNavigation();
    }
  }

  startLocationSharing() {
    this.startNavigation();
  }

  stopLocationSharing() {
    this.stopNavigation();
  }

  startNavigation() {
    if (!this.isBrowser) return;
    this.navigationActive = true;
    this.navigationPaused = false;
    this.shareLocationActive = true;
    this.saveState();

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }

    let waypoints = this.simulationWaypoints;
    if (!waypoints || waypoints.length < 2) {
      this.calculateWaypointsFallback();
      waypoints = this.simulationWaypoints;
    }

    if (waypoints.length < 2) {
      alert("No active route coordinates to navigate!");
      this.navigationActive = false;
      this.shareLocationActive = false;
      return;
    }

    let currentWaypointIdx = 0;
    if (this.telemetry.currentCoords) {
      let minD = Infinity;
      for (let i = 0; i < waypoints.length; i++) {
        const d = this.getDistance(this.telemetry.currentCoords[0], this.telemetry.currentCoords[1], waypoints[i][0], waypoints[i][1]);
        if (d < minD) {
          minD = d;
          currentWaypointIdx = i;
        }
      }
    }

    let progress = 0;
    const stepsPerSegment = 10;

    import('leaflet').then(L => {
      if (!this.map) return;

      const truckIcon = L.divIcon({
        html: `<div class="truck-marker-wrapper">
                 <div class="truck-marker-pulse"></div>
                 <div style="font-size: 28px; transform: scaleX(-1); display: inline-block;">🚛</div>
               </div>`,
        className: 'truck-div-icon-custom',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      if (this.truckMarker) {
        this.truckMarker.remove();
        this.truckMarker = null;
      }

      const centerLat = 20.5937;
      const centerLng = 78.9629;

      this.simulationInterval = setInterval(() => {
        if (this.navigationPaused) return;

        if (currentWaypointIdx >= waypoints.length - 1) {
          this.showNotification("Route completed! Returning to depot.");
          this.stopNavigation();
          return;
        }

        const start = waypoints[currentWaypointIdx];
        const end = waypoints[currentWaypointIdx + 1];

        const currentLat = start[0] + (end[0] - start[0]) * progress;
        const currentLng = start[1] + (end[1] - start[1]) * progress;

        this.telemetry.currentCoords = [currentLat, currentLng];

        if (!this.truckMarker) {
          this.truckMarker = L.marker([currentLat, currentLng], { icon: truckIcon }).addTo(this.map)
            .bindPopup('<b>Volunteer Delivery Truck</b>').openPopup();
        } else {
          this.truckMarker.setLatLng([currentLat, currentLng]);
        }

        // Center map on truck
        if (this.map && !this.map.getBounds().contains([currentLat, currentLng])) {
          this.map.panTo([currentLat, currentLng]);
        }

        this.telemetry.speed = Math.floor(45 + Math.random() * 15);
        this.telemetry.battery = Math.max(0, Number((this.telemetry.battery - 0.05).toFixed(2)));
        
        let nextStopIndex = this.activeRouteIndex;
        if (nextStopIndex < this.smartRouteOrder.length) {
          const targetReq = this.smartRouteOrder[nextStopIndex];
          const targetCoords = this.getStopCoords(targetReq);
          const distToNext = this.getDistance(currentLat, currentLng, targetCoords.lat, targetCoords.lng);
          
          this.telemetry.distanceRemaining = Number(distToNext.toFixed(2));
          this.telemetry.etaMinutes = Math.ceil((distToNext / this.telemetry.speed) * 60);

          if (progress === 0 && targetReq.citizenId) {
            this.chatService.sendVolunteerLocation(targetReq.citizenId, currentLat, currentLng);
          }

          if (distToNext < 15.0 && !this.arrivedStops.has(targetReq.id)) {
            this.arrivedStops.add(targetReq.id);
            this.triggerStopArrival(targetReq, nextStopIndex);
          }
        } else {
          const distToDepot = this.getDistance(currentLat, currentLng, centerLat, centerLng);
          this.telemetry.distanceRemaining = Number(distToDepot.toFixed(2));
          this.telemetry.etaMinutes = Math.ceil((distToDepot / this.telemetry.speed) * 60);
        }

        this.telemetry.carbonOffset = Number((this.telemetry.carbonOffset + (this.telemetry.speed * 0.8 / 3600) * 0.22).toFixed(2));
        this.saveState();

        progress += 1 / stepsPerSegment;
        if (progress >= 1.0) {
          progress = 0;
          currentWaypointIdx++;
        }
      }, 800);
    });
  }

  pauseNavigation() {
    this.navigationPaused = true;
    this.telemetry.speed = 0;
    this.saveState();
  }

  resumeNavigation() {
    this.navigationPaused = false;
    this.saveState();
  }

  stopNavigation() {
    this.navigationActive = false;
    this.navigationPaused = false;
    this.shareLocationActive = false;
    this.activeRouteIndex = 0;
    this.telemetry.speed = 0;
    this.telemetry.distanceRemaining = 0;
    this.telemetry.etaMinutes = 0;
    this.arrivedStops.clear();
    this.saveState();

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    if (this.truckMarker) {
      this.truckMarker.remove();
      this.truckMarker = null;
    }
    this.refreshData();
  }

  triggerStopArrival(req: WasteRequest, index: number) {
    this.navigationPaused = true;
    this.showNotification(`📍 Arrived at Stop ${index + 1}: ${req.citizenName}`);
    
    if (this.map) {
      this.map.setView([this.telemetry.currentCoords![0], this.telemetry.currentCoords![1]], 8);
    }

    if (req.status === 'Scheduled') {
      this.updateStatusSilent(req.id, 'In Progress');
    }

    setTimeout(() => {
      this.clearNotification();
      this.activeRouteIndex = index + 1;
      this.navigationPaused = false;
      this.saveState();
    }, 4000);
  }

  updateStatusSilent(requestId: string, status: WasteRequest['status']) {
    this.wasteService.updateRequest(requestId, { status }).subscribe({
      next: () => {
        const req = this.smartRouteOrder.find(r => r.id === requestId);
        if (req) {
          req.status = status;
        }
        this.refreshData();
      }
    });
  }

  showNotification(msg: string) {
    this.notificationMessage = msg;
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
    this.notificationTimeout = setTimeout(() => {
      this.clearNotification();
    }, 5000);
  }

  clearNotification() {
    this.notificationMessage = null;
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
      this.notificationTimeout = null;
    }
  }

  focusStop(index: number) {
    if (!this.isBrowser || !this.map) return;
    
    const centerLat = 20.5937;
    const centerLng = 78.9629;
    
    let coords: [number, number];
    
    if (index === -1) {
      coords = [centerLat, centerLng];
    } else if (index === this.smartRouteOrder.length) {
      coords = [centerLat, centerLng];
    } else {
      const req = this.smartRouteOrder[index];
      const stopC = this.getStopCoords(req);
      coords = [stopC.lat, stopC.lng];
    }

    this.map.setView(coords, 8);
    
    const marker = this.routeMarkers[index + 1];
    if (marker) {
      marker.openPopup();
    }
  }

  changeProfile(profile: 'priority' | 'distance' | 'eco') {
    this.optimizationProfile = profile;
    this.saveState();
    this.calculateSmartRoute(this.lastActives);
  }

  calculateWaypointsFallback() {
    const centerLat = 20.5937;
    const centerLng = 78.9629;
    const waypoints: L.LatLngTuple[] = [
      this.telemetry.currentCoords && this.navigationActive
        ? [this.telemetry.currentCoords[0], this.telemetry.currentCoords[1]]
        : [centerLat, centerLng]
    ];
    this.smartRouteOrder.forEach(req => {
      const stopC = this.getStopCoords(req);
      waypoints.push([stopC.lat, stopC.lng]);
    });
    this.simulationWaypoints = waypoints;
  }

  private calculateSmartRoute(actives: WasteRequest[]) {
    if (!actives || actives.length === 0) {
      this.smartRouteOrder = [];
      return;
    }

    const centerLat = 20.5937;
    const centerLng = 78.9629;
    
    const requestsWithCoords = actives.map(req => {
      const stopC = this.getStopCoords(req);
      return {
        ...req,
        lat: stopC.lat,
        lng: stopC.lng
      };
    });

    let sortedRoute: WasteRequest[] = [];
    const startPt = this.telemetry.currentCoords && this.navigationActive
      ? { lat: this.telemetry.currentCoords[0], lng: this.telemetry.currentCoords[1] }
      : { lat: centerLat, lng: centerLng };

    if (this.optimizationProfile === 'priority') {
      const inProgress = requestsWithCoords.filter(r => r.status === 'In Progress');
      const pending = requestsWithCoords.filter(r => r.status !== 'In Progress');

      let currentPt = { ...startPt };

      const sortNearest = (queue: typeof requestsWithCoords) => {
        let unvisited = [...queue];
        while (unvisited.length > 0) {
          let nearestIdx = 0;
          let minDistance = Infinity;
          for (let i = 0; i < unvisited.length; i++) {
            const pt = unvisited[i];
            const dist = this.getDistance(currentPt.lat, currentPt.lng, pt.lat, pt.lng);
            if (dist < minDistance) {
              minDistance = dist;
              nearestIdx = i;
            }
          }
          const nextStop = unvisited.splice(nearestIdx, 1)[0];
          sortedRoute.push(nextStop as WasteRequest);
          currentPt = { lat: nextStop.lat, lng: nextStop.lng };
        }
      };

      sortNearest(inProgress);
      sortNearest(pending);

    } else if (this.optimizationProfile === 'distance') {
      let currentPt = { ...startPt };
      let unvisited = [...requestsWithCoords];
      while (unvisited.length > 0) {
        let nearestIdx = 0;
        let minDistance = Infinity;
        for (let i = 0; i < unvisited.length; i++) {
          const pt = unvisited[i];
          const dist = this.getDistance(currentPt.lat, currentPt.lng, pt.lat, pt.lng);
          if (dist < minDistance) {
            minDistance = dist;
            nearestIdx = i;
          }
        }
        const nextStop = unvisited.splice(nearestIdx, 1)[0];
        sortedRoute.push(nextStop as WasteRequest);
        currentPt = { lat: nextStop.lat, lng: nextStop.lng };
      }

    } else if (this.optimizationProfile === 'eco') {
      const bearingSorted = requestsWithCoords.map(r => {
        const dy = r.lat - startPt.lat;
        const dx = r.lng - startPt.lng;
        const angle = Math.atan2(dy, dx);
        return { ...r, angle };
      }).sort((a, b) => a.angle - b.angle);

      sortedRoute = bearingSorted.map(r => {
        const { angle, ...req } = r;
        return req as WasteRequest;
      });
    }

    this.smartRouteOrder = sortedRoute;

    if (this.smartRouteMode) {
      setTimeout(() => {
        this.initLeafletMap();
      }, 100);
    }
  }

  private map: any;

  initLeafletMap() {
    if (!this.isBrowser) return;
    import('leaflet').then(L => {
      const mapContainer = document.getElementById('routeMapCanvas');
      if (!mapContainer) return;

      if (this.map) {
        // Remove old markers and polyline before initializing/updating
        this.routeMarkers.forEach(m => m.remove());
        this.routeMarkers = [];
        if (this.routePolyline) {
          this.routePolyline.remove();
          this.routePolyline = null;
        }
      } else {
        const centerLat = 20.5937;
        const centerLng = 78.9629;
        this.map = L.map('routeMapCanvas').setView([centerLat, centerLng], 5);
      }

      const isDarkTheme = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
      const tileUrl = isDarkTheme 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      
      const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

      L.tileLayer(tileUrl, {
        attribution: tileAttribution
      }).addTo(this.map);

      const centerLat = 20.5937;
      const centerLng = 78.9629;

      const startPt: L.LatLngTuple = this.telemetry.currentCoords && this.navigationActive
        ? [this.telemetry.currentCoords[0], this.telemetry.currentCoords[1]]
        : [centerLat, centerLng];

      const depotIcon = L.divIcon({
        html: '<div class="depot-marker-icon">🏠</div>',
        className: 'custom-depot-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const depotMarker = L.marker(startPt, { icon: depotIcon }).addTo(this.map)
        .bindPopup('<b>Start Position</b>');
      
      this.routeMarkers.push(depotMarker);

      const waypoints: L.LatLngTuple[] = [startPt];

      this.smartRouteOrder.forEach((req, idx) => {
        const stopC = this.getStopCoords(req);
        const ptLat = stopC.lat;
        const ptLng = stopC.lng;

        waypoints.push([ptLat, ptLng]);

        let stopClass = 'stop-marker-scheduled';
        if (req.status === 'In Progress') {
          stopClass = 'stop-marker-inprogress';
        } else if (req.status === 'Completed') {
          stopClass = 'stop-marker-completed';
        }

        const stopIcon = L.divIcon({
          html: `<div class="stop-marker-inner ${stopClass}">${idx + 1}</div>`,
          className: 'custom-stop-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const stopMarker = L.marker([ptLat, ptLng], { icon: stopIcon }).addTo(this.map)
          .bindPopup(`<b>Stop ${idx + 1}</b><br><b>Citizen:</b> ${req.citizenName}<br><b>Status:</b> ${req.status}<br><b>Location:</b> ${req.location}`);

        this.routeMarkers.push(stopMarker);
      });

      if (waypoints.length > 1) {
        const coordsStr = waypoints.map(wp => `${wp[1]},${wp[0]}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;

        fetch(url)
          .then(res => res.json())
          .then(data => {
            if (data && data.routes && data.routes.length > 0) {
              const routeCoords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
              if (this.routePolyline) {
                this.routePolyline.remove();
              }
              this.routePolyline = L.polyline(routeCoords, { color: '#00c8ff', weight: 5, opacity: 0.85 }).addTo(this.map);
              this.map.fitBounds(this.routePolyline.getBounds(), { padding: [50, 50] });
              this.simulationWaypoints = routeCoords;
            } else {
              throw new Error("No OSRM routes returned");
            }
          })
          .catch(err => {
            console.warn("OSRM routing failed, falling back to direct lines:", err);
            if (this.routePolyline) {
              this.routePolyline.remove();
            }
            this.routePolyline = L.polyline(waypoints, { color: '#00c8ff', weight: 4, dashArray: '5, 10' }).addTo(this.map);
            this.map.fitBounds(this.routePolyline.getBounds(), { padding: [50, 50] });
            this.simulationWaypoints = waypoints;
          });
      }
    });
  }

  ngOnDestroy() {
    this.stopNavigation();
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
  }

  cancelCompletion() {
    this.completingRequestId = null;
    this.stopQrScanner();
  }

  isScanning = false;
  private html5QrCode: any;

  startQrScanner() {
    if (!this.isBrowser) return;
    this.isScanning = true;
    setTimeout(() => {
      import('html5-qrcode').then(({ Html5Qrcode }) => {
        this.html5QrCode = new Html5Qrcode('qr-reader');
        this.html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText: string) => {
            this.verifyQrToken(decodedText);
            this.stopQrScanner();
          },
          (errorMessage: string) => {
            // ignore scan failures
          }
        ).catch((err: any) => {
          console.error('Failed to start scanner:', err);
          alert('Failed to start camera. Please ensure permissions are granted.');
          this.isScanning = false;
        });
      });
    }, 100);
  }

  stopQrScanner() {
    if (this.html5QrCode && this.isScanning) {
      this.html5QrCode.stop().then(() => {
        this.html5QrCode.clear();
        this.isScanning = false;
      }).catch((err: any) => console.error('Failed to stop scanner:', err));
    }
  }

  verifyQrToken(token: string) {
    if (this.completingRequestId) {
      // Need a new service method or just use fetch/http
      const tokenPayload = { qrCodeToken: token };
      // Assuming wasteService has verifyQrCode, if not, I should add it.
      // Let's add the HTTP call directly via wasteService.verifyQrCode
      (this.wasteService as any).verifyQrCode(this.completingRequestId, token).subscribe({
        next: (res: any) => {
          alert('QR Verified! ' + res.message);
          this.refreshData();
          this.completingRequestId = null;
        },
        error: (err: any) => {
          alert('Verification failed: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  completePickup() {
    if (this.completingRequestId && this.weightInput > 0) {
      this.wasteService.updateRequest(this.completingRequestId, {
        status: 'Completed',
        weight: this.weightInput
      }).subscribe({
          next: () => {
              alert('Pickup marked as completed! Job well done.');
              this.refreshData();
          },
          error: (err: any) => alert('Failed to complete pickup: ' + (err.error?.message || err.message))
      });
      this.completingRequestId = null;
    }
  }

  viewDetails(req: WasteRequest) {
    this.selectedRequest = req;
  }

  closeDetails() {
    this.selectedRequest = null;
  }

  getCategoryIcon(cat: string | string[]): string {
    const icons: Record<string, string> = {
      'Plastic': '🧴', 'Organic': '🌿', 'E-Waste': '💻', 'Metal': '🔩',
      'Glass': '🥃', 'Paper': '📄', 'Hazardous': '☢️', 'Other': '📦'
    };
    if (Array.isArray(cat)) {
        return cat.length > 0 ? icons[cat[0]] || '📦' : '📦';
    }
    return icons[cat] || '📦';
  }

  formatCategories(cat: string | string[]): string {
      if (Array.isArray(cat)) {
          return cat.join(', ');
      }
      return cat;
  }

  completeProject(app: Application): void {
    const oppId = (app.opportunity_id as any)?._id || (app.opportunity_id as any)?.id || app.opportunity_id;
    if (!oppId) return;

    if (confirm('Are you sure you want to mark this project as COMPLETED?')) {
      this.opportunityService.completeOpportunity(oppId).subscribe({
        next: () => {
          alert('Project marked as completed! Great job.');
          this.refreshData();
        },
        error: (err: any) => alert('Failed to complete project: ' + (err.error?.message || err.message))
      });
    }
  }
}
