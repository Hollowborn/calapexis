<script lang="ts">
	import { getContext, onMount, onDestroy } from 'svelte';
	import { enhance } from '$app/forms';
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
	import * as Field from "$lib/components/ui/field/index.js";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import * as Table from "$lib/components/ui/table/index.js";
	import * as Popover from "$lib/components/ui/popover/index.js";
	import * as Command from "$lib/components/ui/command/index.js";
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { toast } from 'svelte-sonner';
	import { MOCK_BUILDINGS, MOCK_OFFICES, verifyVisitor, checkoutLocalVisitor, isSupabaseConfigured, supabase, getDbClient } from '$lib/supabase';
	
	// Lucide Icons
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import UserCheckIcon from "@lucide/svelte/icons/user-check";
	import UserXIcon from "@lucide/svelte/icons/user-x";
	import LogOutIcon from "@lucide/svelte/icons/log-out";
	import QrCodeIcon from "@lucide/svelte/icons/qr-code";
	import MapPinIcon from "@lucide/svelte/icons/map-pin";
	import ActivityIcon from "@lucide/svelte/icons/activity";
	import SearchIcon from "@lucide/svelte/icons/search";
	import AlertTriangleIcon from "@lucide/svelte/icons/alert-triangle";
	import MapIcon from "@lucide/svelte/icons/map";
	import UsersIcon from "@lucide/svelte/icons/users";
	import CameraIcon from "@lucide/svelte/icons/camera";
	import UploadIcon from "@lucide/svelte/icons/upload";
	import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
	import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
	import CheckIcon from "@lucide/svelte/icons/check";
	import PhoneOffIcon from "@lucide/svelte/icons/phone-off";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import MinusIcon from "@lucide/svelte/icons/minus";
	import LayersIcon from "@lucide/svelte/icons/layers";

	let { data } = $props();

	const dashboardContext = getContext<any>("dashboard-state");
	let visitors = $derived(
		dashboardContext.visitors?.length ? dashboardContext.visitors : (data?.visitors || [])
	);

	let officesList = $derived(data?.offices?.length ? data.offices : MOCK_OFFICES);
	let buildingsList = $derived(data?.buildings?.length ? data.buildings : MOCK_BUILDINGS);

	// Display mode states
	let activeTab = $state<'map' | 'visitors'>('map');
	let searchQuery = $state('');

	// Map Layer & Tile states
	let selectedBaseTile = $state<'osm' | 'satellite'>('osm');
	let showCampusOverlay = $state(true);
	let showOfficeNodes = $state(true);
	let isLayerPopoverOpen = $state(false);

	let osmLayerInstance: any = null;
	let satelliteLayerInstance: any = null;
	let campusOverlayInstance: any = null;

	// Rejection Dialog state
	let isRejecting = $state(false);
	let rejectingVisitorId = $state('');
	let rejectionReason = $state('');

	// Checkout Confirmation AlertDialog state
	let isCheckoutDialogOpen = $state(false);
	let checkoutTargetVisitor = $state<any | null>(null);
	let isCheckingOut = $state(false);

	// Assisted Registration Modal state (for Visitors without phones)
	let isAssistModalOpen = $state(false);
	let assistFirstName = $state('');
	let assistMiddleName = $state('');
	let assistLastName = $state('');
	let assistEmail = $state('');
	let assistPhone = $state('');
	let assistOfficeId = $state('');
	let assistPurpose = $state('');
	let assistPhotoUrl = $state('');
	let isAssistCameraActive = $state(false);
	let isAssistOfficeComboOpen = $state(false);
	let assistVideoElement = $state<HTMLVideoElement | null>(null);
	let assistCanvasElement = $state<HTMLCanvasElement | null>(null);
	let isSubmittingAssist = $state(false);

	// Leaflet map references
	let mapContainer = $state<HTMLDivElement | null>(null);
	let leafMap: any = $state(null);
	let leafletInstance: any = $state(null);
	let visitorMarkers: Record<string, any> = {};
	let officeMarkers: Record<string, any> = {};

	// Campus Bounds
	const campusBoundsCoords = [
		[9.893421456778755, 123.8815211010603],
		[9.895647770829878, 123.88369296680753]
	];
	const mainGateCoords = { lat: 9.894144489361919, lng: 123.88273758838274 };

	// Dynamic derived listings directly from database context
	let liveMonitorList = $derived(
		visitors.filter((v: any) => (v.status === 'checked_in' || v.status === 'preliminary') && v.verificationStatus !== 'rejected')
	);

	let filteredLiveMonitorList = $derived(
		liveMonitorList.filter((v: any) => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase().trim();
			return (
				v.fullName.toLowerCase().includes(q) ||
				v.passCode.toLowerCase().includes(q) ||
				(v.buildingName && v.buildingName.toLowerCase().includes(q)) ||
				(v.email && v.email.toLowerCase().includes(q))
			);
		})
	);

	let filteredVisitorsList = $derived(
		visitors.filter((v: any) => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase().trim();
			return (
				v.fullName.toLowerCase().includes(q) ||
				v.passCode.toLowerCase().includes(q) ||
				(v.officeName && v.officeName.toLowerCase().includes(q)) ||
				(v.phone && v.phone.toLowerCase().includes(q)) ||
				(v.email && v.email.toLowerCase().includes(q))
			);
		})
	);

	let pendingVerificationQueue = $derived(
		visitors.filter((v: any) => v.verificationStatus === 'pending')
	);

	let assistSelectedOffice = $derived(officesList.find(o => o.id === assistOfficeId));

	// Real-Time Security Audit Log Feed
	let securityAuditLog = $derived.by(() => {
		const logs: { id: string; time: string; title: string; detail: string; type: 'entry' | 'checkout' | 'verify' }[] = [];
		visitors.forEach((v: any) => {
			if (v.status === 'preliminary') {
				logs.push({
					id: `pre-${v.id}`,
					time: formatTime(v.createdAt || v.checkInTime),
					title: `${v.fullName} Registered Pre-Pass`,
					detail: `Target: ${v.officeName || 'Campus'} • ${v.passCode}`,
					type: 'verify'
				});
			} else if (v.checkInTime && v.status === 'checked_in') {
				logs.push({
					id: `in-${v.id}`,
					time: formatTime(v.checkInTime),
					title: `${v.fullName} Checked In`,
					detail: `${v.officeName || 'Campus Gate'} • ${v.passCode}`,
					type: 'entry'
				});
			}
			if (v.checkOutTime) {
				logs.push({
					id: `out-${v.id}`,
					time: formatTime(v.checkOutTime),
					title: `${v.fullName} Checked Out`,
					detail: `Duration: ${calculateVisitDuration(v.checkInTime, v.checkOutTime)}`,
					type: 'checkout'
				});
			}
		});
		return logs.slice(-10).reverse();
	});

	function formatTime(iso: string) {
		if (!iso) return '';
		return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function calculateVisitDuration(checkInTimeStr?: string | null, checkOutTimeStr?: string | null): string {
		if (!checkInTimeStr) return '--';
		const start = new Date(checkInTimeStr).getTime();
		const end = checkOutTimeStr ? new Date(checkOutTimeStr).getTime() : Date.now();
		const diffMs = Math.max(0, end - start);
		const mins = Math.floor(diffMs / 60000);
		if (mins < 1) return 'Just now';
		if (mins < 60) return `${mins}m ${checkOutTimeStr ? 'total' : 'elapsed'}`;
		const hrs = Math.floor(mins / 60);
		const remMins = mins % 60;
		return `${hrs}h ${remMins}m ${checkOutTimeStr ? 'total' : 'elapsed'}`;
	}

	function findNearestBuildingName(lat?: number, lng?: number): string {
		if (!lat || !lng || !buildingsList.length) return 'Main Gate';
		let nearestName = 'Main Gate';
		let minDistance = Infinity;
		for (const b of buildingsList) {
			const bLat = b.lat || b.xCoord || 9.8944;
			const bLng = b.lng || b.yCoord || 123.8825;
			const dist = Math.hypot(lat - bLat, lng - bLng);
			if (dist < minDistance) {
				minDistance = dist;
				nearestName = b.name;
			}
		}
		return nearestName;
	}

	onMount(async () => {
		if (typeof window === 'undefined') return;

		let L = (window as any).L;
		if (!L) {
			try {
				const leafletModule = await import('leaflet');
				L = leafletModule.default || leafletModule;
			} catch (e) {
				console.error("Failed to load Leaflet module:", e);
			}
		}

		if (!L || !mapContainer) return;
		leafletInstance = L;

		const bounds = L.latLngBounds(campusBoundsCoords[0], campusBoundsCoords[1]);
		const map = L.map(mapContainer, {
			zoomControl: false,
			maxBounds: bounds,
			maxBoundsViscosity: 1.0,
			minZoom: 18,
			maxZoom: 22
		}).setView([9.894414742474977, 123.88258093049176], 19);

		const osmTile = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: '&copy; OpenStreetMap',
			maxNativeZoom: 19,
			maxZoom: 22
		});

		const satTile = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
			attribution: '&copy; Esri',
			maxNativeZoom: 19,
			maxZoom: 22
		});

		const overlay = L.imageOverlay("/campusMap-adjusted.png", bounds, {
			opacity: 0.95,
			interactive: false
		});

		osmLayerInstance = osmTile;
		satelliteLayerInstance = satTile;
		campusOverlayInstance = overlay;

		if (selectedBaseTile === 'osm') osmTile.addTo(map);
		else satTile.addTo(map);

		if (showCampusOverlay) overlay.addTo(map);

		leafMap = map;

		plotVisitorNodesOnMap();
		plotOfficeNodesOnMap();

		setTimeout(() => map.invalidateSize(), 300);

		if (typeof window !== 'undefined') {
			(window as any).handleSecurityMapCheckout = (visitorId: string) => {
				const target = visitors.find((v: any) => v.id === visitorId);
				if (target) {
					promptCheckout(target);
				}
			};
		}

		// Supabase Realtime Subscription for Visitor Logs
		if (isSupabaseConfigured && supabase) {
			const dbClient = getDbClient();
			const channel = dbClient
				.channel('realtime:security-visitor-logs')
				.on('postgres_changes', { event: '*', schema: 'public', table: 'visitor_logs' }, () => {
					if (dashboardContext?.loadData) dashboardContext.loadData();
				})
				.subscribe();

			onDestroy(() => {
				dbClient.removeChannel(channel);
				if (typeof window !== 'undefined') {
					delete (window as any).handleSecurityMapCheckout;
				}
			});
		} else {
			onDestroy(() => {
				if (typeof window !== 'undefined') {
					delete (window as any).handleSecurityMapCheckout;
				}
			});
		}
	});

	// Tile Layer Watcher
	$effect(() => {
		if (!leafMap) return;

		if (selectedBaseTile === 'osm') {
			if (satelliteLayerInstance && leafMap.hasLayer(satelliteLayerInstance)) {
				leafMap.removeLayer(satelliteLayerInstance);
			}
			if (osmLayerInstance && !leafMap.hasLayer(osmLayerInstance)) {
				osmLayerInstance.addTo(leafMap);
			}
		} else {
			if (osmLayerInstance && leafMap.hasLayer(osmLayerInstance)) {
				leafMap.removeLayer(osmLayerInstance);
			}
			if (satelliteLayerInstance && !leafMap.hasLayer(satelliteLayerInstance)) {
				satelliteLayerInstance.addTo(leafMap);
			}
		}

		if (campusOverlayInstance) {
			if (showCampusOverlay) {
				if (!leafMap.hasLayer(campusOverlayInstance)) campusOverlayInstance.addTo(leafMap);
			} else {
				if (leafMap.hasLayer(campusOverlayInstance)) leafMap.removeLayer(campusOverlayInstance);
			}
		}
	});

	// Re-calc Leaflet dimensions when switching back to Live Map tab
	$effect(() => {
		if (activeTab === 'map' && leafMap) {
			setTimeout(() => {
				leafMap.invalidateSize();
				plotVisitorNodesOnMap();
				plotOfficeNodesOnMap();
			}, 100);
		}
	});

	$effect(() => {
		if (leafMap && liveMonitorList) {
			plotVisitorNodesOnMap();
		}
	});

	$effect(() => {
		if (leafMap && officesList && buildingsList && (showOfficeNodes !== undefined || visitors)) {
			plotOfficeNodesOnMap();
		}
	});

	function plotOfficeNodesOnMap() {
		if (!leafMap || !leafletInstance) return;
		const L = leafletInstance;

		Object.values(officeMarkers).forEach(m => leafMap.removeLayer(m));
		officeMarkers = {};

		if (!showOfficeNodes) return;

		// Track count of offices per parent building to calculate gentle radial offsets for multiple desks in one building
		const buildingOfficeCounts: Record<string, number> = {};
		const buildingOfficeIndices: Record<string, number> = {};

		officesList.forEach((o: any) => {
			if (o.buildingId && (o.isActive || o.isActive === undefined)) {
				buildingOfficeCounts[o.buildingId] = (buildingOfficeCounts[o.buildingId] || 0) + 1;
			}
		});

		officesList.forEach((office: any) => {
			if (office.isActive === false) return;
			const b = buildingsList.find((b: any) => b.id === office.buildingId);
			if (!b) return;

			const baseLat = b.lat || b.xCoord || 9.894414;
			const baseLng = b.lng || b.yCoord || 123.88258;
			const color = b.color || '#3b82f6';

			const totalInBuilding = buildingOfficeCounts[office.buildingId] || 1;
			let lat = baseLat;
			let lng = baseLng;

			if (totalInBuilding > 1) {
				const idx = buildingOfficeIndices[office.buildingId] || 0;
				buildingOfficeIndices[office.buildingId] = idx + 1;
				const angle = (idx / totalInBuilding) * 2 * Math.PI;
				const offset = 0.000045; // ~5 meters radial separation for clarity
				lat = baseLat + Math.sin(angle) * offset;
				lng = baseLng + Math.cos(angle) * offset;
			}

			// Active visitors currently at this specific office desk
			const activeDeskVisitors = visitors.filter((v: any) => 
				(v.officeId === office.id || (v.officeName && v.officeName.toLowerCase() === office.name.toLowerCase())) && 
				v.status === 'checked_in'
			);
			const activeCount = activeDeskVisitors.length;

			const iconHtml = `
				<div class="group relative flex items-center justify-center cursor-pointer transition-transform hover:scale-110">
					<div class="px-2 py-0.5 rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-md flex items-center gap-1.5" style="border-left: 3px solid ${color};">
						<span class="size-2 rounded-full inline-block shrink-0 shadow-xs" style="background-color: ${color};"></span>
						<span class="text-[10px] font-black text-foreground whitespace-nowrap">${office.code || office.name}</span>
						${activeCount > 0 ? `<span class="bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full leading-none animate-pulse">${activeCount}</span>` : ''}
					</div>
				</div>
			`;

			const marker = L.marker([lat, lng], {
				icon: L.divIcon({
					className: "bg-transparent border-none",
					html: iconHtml,
					iconSize: [90, 26],
					iconAnchor: [45, 13]
				}),
				zIndexOffset: 500
			}).bindPopup(`
				<div class="font-sans text-xs p-1 max-w-xs flex flex-col gap-2">
					<div class="flex items-start justify-between gap-2 border-b border-border/60 pb-1.5">
						<div>
							<div class="font-black text-foreground text-sm">${office.name}</div>
							<div class="text-[10px] text-muted-foreground font-semibold flex items-center gap-1 mt-0.5">
								<span>Building: ${b.name}</span>
								<span>(${b.code || 'CAMPUS'})</span>
							</div>
						</div>
						<span class="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
							${office.code || 'DESK'}
						</span>
					</div>

					<div class="flex flex-col gap-1 text-[11px] text-muted-foreground">
						${office.headPerson ? `<div><span class="font-bold text-foreground">Head:</span> ${office.headPerson}</div>` : ''}
						${office.contactEmail ? `<div><span class="font-bold text-foreground">Email:</span> ${office.contactEmail}</div>` : ''}
						${office.operatingHours ? `<div><span class="font-bold text-foreground">Hours:</span> ${office.operatingHours}</div>` : ''}
						${office.description ? `<div class="text-[10px] bg-muted/40 p-1.5 rounded-lg text-muted-foreground mt-0.5">${office.description}</div>` : ''}
					</div>

					<div class="border-t border-border/60 pt-1.5 flex items-center justify-between">
						<span class="text-[10px] font-bold text-muted-foreground uppercase">Active Visitors</span>
						<span class="text-xs font-black ${activeCount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}">
							${activeCount} checked in
						</span>
					</div>

					${activeCount > 0 ? `
						<div class="max-h-28 overflow-y-auto flex flex-col gap-1.5 pt-1 border-t border-border/40">
							${activeDeskVisitors.map((v: any) => `
								<div class="text-[10px] flex items-center justify-between bg-muted/40 p-1.5 rounded-xl border border-border/50">
									<div class="flex flex-col pr-1">
										<span class="font-bold text-foreground truncate max-w-[110px]">${v.fullName}</span>
										<span class="font-mono text-[9px] text-primary">${v.passCode}</span>
									</div>
									<button 
										type="button" 
										onclick="window.handleSecurityMapCheckout('${v.id}')"
										class="h-6 px-2 rounded-lg bg-destructive/15 hover:bg-destructive text-destructive hover:text-destructive-foreground font-extrabold text-[9px] flex items-center gap-1 transition-colors cursor-pointer shrink-0"
										title="Check out ${v.fullName}"
									>
										<span>Check Out</span>
									</button>
								</div>
							`).join('')}
						</div>
					` : ''}
				</div>
			`).addTo(leafMap);

			officeMarkers[office.id] = marker;
		});
	}

	function plotVisitorNodesOnMap() {
		if (!leafMap || !leafletInstance) return;
		const L = leafletInstance;

		Object.values(visitorMarkers).forEach(m => leafMap.removeLayer(m));
		visitorMarkers = {};

		liveMonitorList.forEach((v: any) => {
			const lat = v.lastLatitude || v.lat || mainGateCoords.lat;
			const lng = v.lastLongitude || v.lng || mainGateCoords.lng;
			const nearestNode = findNearestBuildingName(lat, lng);
			const duration = calculateVisitDuration(v.checkInTime, null);

			const avatarSrc = v.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(v.fullName || 'Visitor')}&background=0284c7&color=ffffff&bold=true&size=128`;

			const iconHtml = `
				<div class="group relative flex items-center justify-center cursor-pointer">
					<span class="animate-ping absolute inline-flex size-9 rounded-full bg-emerald-500/40"></span>
					<div class="relative size-9 rounded-full bg-card border-2 border-emerald-500 shadow-xl overflow-hidden flex items-center justify-center">
						<img src="${avatarSrc}" class="size-full object-cover" />
					</div>
				</div>
			`;

			const marker = L.marker([lat, lng], {
				icon: L.divIcon({
					className: "bg-transparent border-none",
					html: iconHtml,
					iconSize: [36, 36],
					iconAnchor: [18, 18]
				})
			}).bindPopup(`
				<div class="font-sans text-xs p-1 max-w-xs flex flex-col gap-1.5 text-popover-foreground">
					<div class="font-extrabold text-foreground flex items-center justify-between gap-2">
						<span>${v.fullName}</span>
						<span class="font-mono text-[10px] font-bold text-primary">${v.passCode}</span>
					</div>
					<div class="text-[10px] text-muted-foreground font-semibold">
						Office: ${v.officeName || 'Campus'}
					</div>
					<div class="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center justify-between border-t border-border/60 pt-1 mt-0.5">
						<span>Near: ${nearestNode}</span>
						<span>${duration}</span>
					</div>
					<button 
						type="button" 
						onclick="window.handleSecurityMapCheckout('${v.id}')"
						class="w-full mt-1.5 h-7.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-extrabold text-[10px] flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
					>
						<span>Check Out Visitor</span>
					</button>
				</div>
			`).addTo(leafMap);

			visitorMarkers[v.id] = marker;
		});
	}

	// Camera Handlers for Assisted Registration
	async function startAssistCamera() {
		try {
			isAssistCameraActive = true;
			const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
			if (assistVideoElement) assistVideoElement.srcObject = stream;
		} catch (err) {
			toast.error("Unable to access desk camera.");
			isAssistCameraActive = false;
		}
	}

	function stopAssistCamera() {
		if (assistVideoElement && assistVideoElement.srcObject) {
			const stream = assistVideoElement.srcObject as MediaStream;
			stream.getTracks().forEach(track => track.stop());
			assistVideoElement.srcObject = null;
		}
		isAssistCameraActive = false;
	}

	function captureAssistSelfie() {
		if (!assistVideoElement || !assistCanvasElement) return;
		const ctx = assistCanvasElement.getContext('2d');
		if (ctx) {
			assistCanvasElement.width = 250;
			assistCanvasElement.height = 250;
			ctx.drawImage(assistVideoElement, 0, 0, 250, 250);
			assistPhotoUrl = assistCanvasElement.toDataURL('image/jpeg', 0.6);
			stopAssistCamera();
			toast.success("Visitor photo captured!");
		}
	}

	function handleAssistFileUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			const reader = new FileReader();
			reader.onload = (event) => {
				const img = new Image();
				img.onload = () => {
					const tempCanvas = document.createElement('canvas');
					tempCanvas.width = 250; tempCanvas.height = 250;
					const ctx = tempCanvas.getContext('2d');
					if (ctx) {
						ctx.drawImage(img, 0, 0, 250, 250);
						assistPhotoUrl = tempCanvas.toDataURL('image/jpeg', 0.6);
						toast.success("Visitor photo uploaded!");
					}
				};
				img.src = event.target?.result as string;
			};
			reader.readAsDataURL(target.files[0]);
		}
	}

	function handleAssistEnhance() {
		isSubmittingAssist = true;
		return async ({ result }: { result: any }) => {
			isSubmittingAssist = false;
			if (result.type === 'success') {
				isAssistModalOpen = false;
				toast.success(result.data?.message || "Visitor registered successfully!");
				assistFirstName = ''; assistMiddleName = ''; assistLastName = ''; assistEmail = ''; assistPhone = ''; assistOfficeId = ''; assistPurpose = ''; assistPhotoUrl = '';
				if (dashboardContext?.loadData) dashboardContext.loadData();
			} else if (result.type === 'failure') {
				toast.error(result.data?.message || "Manual registration failed.");
			}
		};
	}

	function handleApprove(visitorId: string) {
		verifyVisitor(visitorId, 'approved');
		toast.success("Visitor verification approved!");
		if (dashboardContext?.loadData) dashboardContext.loadData();
	}

	function openRejectModal(visitorId: string) {
		rejectingVisitorId = visitorId;
		rejectionReason = '';
		isRejecting = true;
	}

	function confirmReject() {
		if (!rejectingVisitorId) return;
		verifyVisitor(rejectingVisitorId, 'rejected', rejectionReason || 'Failed security desk verification');
		toast.error("Visitor entry rejected.");
		isRejecting = false;
		if (dashboardContext?.loadData) dashboardContext.loadData();
	}

	function promptCheckout(visitor: any) {
		checkoutTargetVisitor = visitor;
		isCheckoutDialogOpen = true;
	}

	async function confirmCheckout() {
		if (!checkoutTargetVisitor) return;
		isCheckingOut = true;
		try {
			const res = await checkoutLocalVisitor(checkoutTargetVisitor.id);
			toast.info(`Visitor ${checkoutTargetVisitor.fullName} checked out of campus.`);
			if (dashboardContext?.loadData) dashboardContext.loadData();
		} catch (e) {
			toast.error("Failed to check out visitor.");
		} finally {
			isCheckingOut = false;
			isCheckoutDialogOpen = false;
			checkoutTargetVisitor = null;
		}
	}
</script>

<div class="m-8 space-y-6">

	<!-- TOP PAGE HEADER (Unencased - Matching Admin Offices Layout 1-to-1) -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
		<div class="flex items-center gap-3">
			<div class="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
				<ShieldCheckIcon class="size-6 pointer-events-none" />
			</div>
			<div>
				<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">Security Command Portal</h1>
				<p class="text-xs text-muted-foreground leading-relaxed font-semibold">Live campus GIS tracking, logbook audit, and phone-less visitor desk registration</p>
			</div>
		</div>

		<div class="flex items-center gap-2.5 flex-wrap">
			<Button onclick={() => isAssistModalOpen = true} class="text-xs font-extrabold gap-1.5 rounded-xl h-10 shadow-md shadow-primary/10 cursor-pointer">
				<PhoneOffIcon class="size-4 pointer-events-none" />
				<span>+ Assist Visitor (No Phone)</span>
			</Button>

			<Tabs.Root value={activeTab} onValueChange={(v) => activeTab = v as 'map' | 'visitors'}>
				<Tabs.List class="bg-muted/80 p-1 rounded-2xl border border-border">
					<Tabs.Trigger value="map" class="rounded-xl text-xs font-bold px-3.5 py-1.5 gap-1.5 cursor-pointer">
						<MapIcon class="size-4 pointer-events-none" />
						<span>Live Map ({liveMonitorList.length})</span>
					</Tabs.Trigger>
					<Tabs.Trigger value="visitors" class="rounded-xl text-xs font-bold px-3.5 py-1.5 gap-1.5 cursor-pointer">
						<UsersIcon class="size-4 pointer-events-none" />
						<span>Logbook ({visitors.length})</span>
					</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>
		</div>
	</div>

	<!-- PENDING VERIFICATIONS BANNER -->
	{#if pendingVerificationQueue.length > 0}
		<Card.Root class="border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/10 rounded-2xl shadow-xs">
			<Card.Header class="pb-2">
				<Card.Title class="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-2 uppercase tracking-wider">
					<AlertTriangleIcon class="size-4 animate-bounce" />
					<span>Pending Security Desk Verifications ({pendingVerificationQueue.length})</span>
				</Card.Title>
			</Card.Header>
			<Card.Content class="p-4 pt-0">
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
					{#each pendingVerificationQueue as p}
						<div class="p-3 rounded-xl border border-amber-500/30 bg-card flex items-center justify-between text-xs">
							<div class="flex items-center gap-2">
								<img src={p.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.fullName || 'Visitor')}&background=0284c7&color=ffffff&bold=true&size=128`} alt={p.fullName} class="size-9 rounded-full object-cover border border-primary/30 shrink-0" />
								<div>
									<div class="font-extrabold text-foreground">{p.fullName}</div>
									<div class="text-[10px] text-muted-foreground font-mono">{p.passCode} • {p.officeName || 'Campus'}</div>
								</div>
							</div>
							<div class="flex gap-1">
								<Button onclick={() => handleApprove(p.id)} size="sm" class="h-8 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">Approve</Button>
								<Button onclick={() => openRejectModal(p.id)} size="sm" variant="destructive" class="h-8 text-xs font-bold rounded-lg cursor-pointer">Reject</Button>
							</div>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- MAIN CONTENT TAB 1: LIVE MAP PORTAL (Kept persistently mounted with CSS visibility) -->
	<div class={activeTab === 'map' ? 'flex flex-col gap-4' : 'hidden'}>
		<!-- SUB-HEADER BAR -->
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
			<div>
				<h2 class="text-xs font-black text-foreground uppercase tracking-wider">Active Campus GIS Tracking ({liveMonitorList.length})</h2>
				<span class="text-xs text-muted-foreground font-semibold">{liveMonitorList.length} active visitor check-in sessions monitored across campus.</span>
			</div>

			<div class="relative w-full sm:w-64">
				<SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
				<Input 
					type="text" 
					placeholder="Search visitor, pass code..." 
					bind:value={searchQuery} 
					class="pl-9 h-9 text-xs rounded-xl"
				/>
			</div>
		</div>

		<!-- MAP & AUDIT LOG GRID -->
		<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
			<!-- MAP CANVAS CONTAINER -->
			<div class="lg:col-span-3 relative h-[560px] rounded-2xl overflow-hidden border border-border shadow-xs bg-card">
				<div bind:this={mapContainer} class="absolute inset-0 z-0"></div>

				<!-- FLOATING MAP CONTROLS (Zoom ButtonGroup & Layers Popover) -->
				<div class="absolute top-4 right-4 z-50 flex items-center gap-2 pointer-events-auto">
					<!-- ZOOM BUTTON GROUP (+ and -) -->
					<div class="flex items-center rounded-2xl border border-border bg-card/90 backdrop-blur-xl shadow-xl overflow-hidden p-0.5">
						<Button 
							onclick={() => leafMap?.zoomIn()} 
							variant="ghost" 
							size="icon" 
							class="size-8 rounded-xl text-foreground hover:bg-muted cursor-pointer"
							title="Zoom In"
						>
							<PlusIcon class="size-4 pointer-events-none" />
						</Button>
						<Separator orientation="vertical" class="h-4 bg-border/60" />
						<Button 
							onclick={() => leafMap?.zoomOut()} 
							variant="ghost" 
							size="icon" 
							class="size-8 rounded-xl text-foreground hover:bg-muted cursor-pointer"
							title="Zoom Out"
						>
							<MinusIcon class="size-4 pointer-events-none" />
						</Button>
					</div>

					<!-- MAP LAYERS & OVERLAY POPOVER -->
					<Popover.Root bind:open={isLayerPopoverOpen}>
						<Popover.Trigger>
							<Button variant="default" size="icon" class="size-9 rounded-2xl border-border bg-card/90 backdrop-blur-xl shadow-xl text-foreground cursor-pointer" title="Map Layers">
								<LayersIcon class="size-4 pointer-events-none" />
							</Button>
						</Popover.Trigger>
						<Popover.Content align="end" sideOffset={8} class="w-64 p-3 rounded-2xl border-border bg-popover text-popover-foreground shadow-2xl z-[2600] flex flex-col gap-3">
							<div class="flex items-center justify-between border-b border-border/60 pb-2">
								<span class="text-xs font-black uppercase tracking-wider text-foreground">Map Layers</span>
								<Badge variant="outline" class="text-[9px] font-mono">Leaflet</Badge>
							</div>

							<!-- Base Tile Map -->
							<div class="flex flex-col gap-1.5">
								<span class="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Base Tile Map</span>
								<div class="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-muted/60 border border-border">
									<button 
										onclick={() => selectedBaseTile = 'osm'}
										class="px-2 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer {selectedBaseTile === 'osm' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
									>
										Standard
									</button>
									<button 
										onclick={() => selectedBaseTile = 'satellite'}
										class="px-2 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer {selectedBaseTile === 'satellite' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'}"
									>
										Satellite
									</button>
								</div>
							</div>

							<Separator class="bg-border/60" />

							<!-- 3D Campus Overlay Switch -->
							<div class="flex items-center justify-between">
								<div>
									<span class="text-xs font-extrabold text-foreground block">Campus Overlay</span>
									<span class="text-[10px] text-muted-foreground font-semibold">3D structure layer</span>
								</div>
								<Switch bind:checked={showCampusOverlay} />
							</div>

							<Separator class="bg-border/60" />

							<!-- Office Desks Layer Switch -->
							<div class="flex items-center justify-between">
								<div>
									<span class="text-xs font-extrabold text-foreground block">Office Nodes</span>
									<span class="text-[10px] text-muted-foreground font-semibold">Display office desks</span>
								</div>
								<Switch bind:checked={showOfficeNodes} />
							</div>
						</Popover.Content>
					</Popover.Root>
				</div>
			</div>

			<!-- SIDE SECURITY AUDIT FEED CARD -->
			<Card.Root class="rounded-2xl border-border bg-card shadow-xs flex flex-col">
				<Card.Header class="pb-3 border-b border-border/50 bg-muted/20">
					<div class="flex items-center justify-between gap-2">
						<Card.Title class="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
							<ActivityIcon class="size-4 text-primary pointer-events-none" />
							<span>Security Audit Log</span>
						</Card.Title>
						<Badge class="bg-primary/15 text-primary font-mono text-[9px] px-2 py-0.5 rounded-lg border border-primary/25">Live</Badge>
					</div>
				</Card.Header>
				<Card.Content class="p-4 flex-1 overflow-y-auto max-h-[480px]">
					<div class="flex flex-col gap-2.5">
						{#each securityAuditLog as log}
							<div class="p-3 rounded-xl border border-border/60 bg-muted/20 text-xs font-semibold flex items-start gap-3 hover:bg-muted/40 transition-colors">
								<div class="size-2 rounded-full mt-1.5 shrink-0 {log.type === 'entry' ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50' : 'bg-rose-500 shadow-xs shadow-rose-500/50'}"></div>
								<div class="flex-1 text-start">
									<div class="flex items-center justify-between gap-2">
										<span class="font-extrabold text-foreground">{log.title}</span>
										<span class="text-[9px] font-mono text-muted-foreground shrink-0">{log.time}</span>
									</div>
									<div class="text-[10px] text-muted-foreground font-mono mt-0.5">{log.detail}</div>
								</div>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>

	<!-- TAB 2: VISITOR LOGBOOK DATA TABLE (Kept persistently mounted with CSS visibility) -->
	<div class={activeTab === 'visitors' ? 'flex flex-col gap-4' : 'hidden'}>
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
			<div>
				<h2 class="text-xs font-black text-foreground uppercase tracking-wider">Visitor Logbook Directory ({filteredVisitorsList.length})</h2>
				<span class="text-xs text-muted-foreground font-semibold">Complete registry of campus entry passes, check-in durations, and status logs.</span>
			</div>

			<div class="relative w-full sm:w-64">
				<SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
				<Input 
					type="text" 
					placeholder="Filter by name, pass code, office..." 
					bind:value={searchQuery} 
					class="pl-9 h-9 text-xs rounded-xl"
				/>
			</div>
		</div>

		<Card.Root class="border-border shadow-xs rounded-2xl bg-card overflow-hidden">
			<Card.Content class="p-0 overflow-x-auto">
				<Table.Root>
					<Table.Header class="bg-muted/30 text-[10px] uppercase font-black tracking-wider">
						<Table.Row class="border-b border-border/60">
							<Table.Head class="pl-5 py-3">Visitor Profile</Table.Head>
							<Table.Head>Pass Code</Table.Head>
							<Table.Head>Destination Office</Table.Head>
							<Table.Head>Purpose</Table.Head>
							<Table.Head>Nearest Landmark / Node</Table.Head>
							<Table.Head>Duration</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="pr-5 text-end">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body class="text-xs font-semibold divide-y divide-border/40">
						{#each filteredVisitorsList as v}
							<Table.Row class="hover:bg-muted/30 transition-colors">
								<Table.Cell class="pl-5 py-3">
									<div class="flex items-center gap-3">
										<img src={v.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(v.fullName || 'Visitor')}&background=0284c7&color=ffffff&bold=true&size=128`} alt={v.fullName} class="size-9 rounded-full object-cover border border-border shrink-0" />
										<div>
											<div class="font-extrabold text-foreground">{v.fullName}</div>
											<div class="text-[10px] text-muted-foreground">{v.phone || v.email || 'No contact'}</div>
										</div>
									</div>
								</Table.Cell>
								<Table.Cell class="font-mono text-xs font-black text-primary">{v.passCode}</Table.Cell>
								<Table.Cell>{v.officeName || 'Campus'}</Table.Cell>
								<Table.Cell class="text-xs text-muted-foreground font-medium max-w-[150px] truncate" title={v.purpose}>
									{v.purpose || 'Campus Visit'}
								</Table.Cell>
								<Table.Cell>
									<Badge variant="outline" class="text-[10px] font-mono gap-1 rounded-lg">
										<MapPinIcon class="size-3 text-primary" />
										<span>{findNearestBuildingName(v.lastLatitude || v.lat, v.lastLongitude || v.lng)}</span>
									</Badge>
								</Table.Cell>
								<Table.Cell class="font-mono text-xs font-bold text-foreground">
									{calculateVisitDuration(v.checkInTime, v.checkOutTime)}
								</Table.Cell>
								<Table.Cell>
									{#if v.status === 'preliminary'}
										<Badge variant="outline" class="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-black rounded-lg gap-1">
											<span class="size-1.5 rounded-full bg-amber-500 animate-pulse"></span>
											<span>Preliminary Pre-Pass</span>
										</Badge>
									{:else if v.status === 'checked_in'}
										<Badge class="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold rounded-lg">Active Pass</Badge>
									{:else}
										<Badge variant="secondary" class="text-[10px] font-bold rounded-lg">Checked Out</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="pr-5 text-end">
									{#if v.status === 'checked_in'}
										<Button onclick={() => promptCheckout(v)} variant="destructive" size="sm" class="h-8 text-xs font-bold rounded-xl cursor-pointer gap-1">
											<LogOutIcon class="size-3.5 pointer-events-none" />
											<span>Check Out</span>
										</Button>
									{:else if v.status === 'preliminary'}
										<span class="text-[10px] text-amber-600 dark:text-amber-400 font-bold font-mono">Pending Check-In</span>
									{:else}
										<span class="text-[10px] text-muted-foreground font-mono">Archived</span>
									{/if}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</Card.Content>
		</Card.Root>
	</div>
</div>

<!-- CHECK OUT CONFIRMATION ALERT DIALOG -->
<AlertDialog.Root bind:open={isCheckoutDialogOpen}>
	<AlertDialog.Portal>
		<AlertDialog.Content class="z-[2600] max-w-sm border-border bg-card text-card-foreground shadow-2xl rounded-3xl">
			<AlertDialog.Header>
				<AlertDialog.Title class="text-base font-black text-foreground flex items-center gap-2">
					<LogOutIcon class="size-5 text-destructive pointer-events-none" />
					<span>Confirm Visitor Check Out</span>
				</AlertDialog.Title>
				<AlertDialog.Description class="text-xs text-muted-foreground leading-relaxed">
					Are you sure you want to check out <strong class="text-foreground">{checkoutTargetVisitor?.fullName}</strong> ({checkoutTargetVisitor?.passCode})? This will mark their pass as completed and calculate their total visit duration.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer class="pt-2 border-t border-border/60">
				<AlertDialog.Cancel onclick={() => isCheckoutDialogOpen = false} class="text-xs font-semibold rounded-xl h-9 cursor-pointer">
					Cancel
				</AlertDialog.Cancel>
				<AlertDialog.Action onclick={confirmCheckout} disabled={isCheckingOut} class="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-extrabold rounded-xl h-9 cursor-pointer">
					{isCheckingOut ? 'Checking Out...' : 'Check Out Visitor'}
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>

<!-- ASSISTED MANUAL VISITOR REGISTRATION MODAL -->
<Dialog.Root bind:open={isAssistModalOpen}>
	<Dialog.Portal>
		<Dialog.Content class="z-[2500] max-w-md border-border bg-card text-card-foreground shadow-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
			<Dialog.Header>
				<Dialog.Title class="text-base font-black text-foreground flex items-center gap-2">
					<PhoneOffIcon class="size-5 text-primary" />
					<span>Assist Visitor (No Phone Setup)</span>
				</Dialog.Title>
				<Dialog.Description class="text-xs text-muted-foreground">
					Register and check in a visitor directly from the Security Desk.
				</Dialog.Description>
			</Dialog.Header>

			<form action="?/registerVisitorManual" method="POST" use:enhance={handleAssistEnhance} class="flex flex-col gap-3 font-semibold text-xs py-2">
				<input type="hidden" name="firstName" value={assistFirstName} />
				<input type="hidden" name="middleName" value={assistMiddleName} />
				<input type="hidden" name="lastName" value={assistLastName} />
				<input type="hidden" name="email" value={assistEmail} />
				<input type="hidden" name="phone" value={assistPhone} />
				<input type="hidden" name="officeId" value={assistOfficeId} />
				<input type="hidden" name="purpose" value={assistPurpose} />
				<input type="hidden" name="photoUrl" value={assistPhotoUrl} />

				<!-- Personal Details -->
				<div class="grid grid-cols-3 gap-2">
					<Field.Field>
						<Field.FieldLabel for="assist-fn">First Name *</Field.FieldLabel>
						<Input id="assist-fn" bind:value={assistFirstName} placeholder="Juan" required class="rounded-xl h-9 text-xs" />
					</Field.Field>
					<Field.Field>
						<Field.FieldLabel for="assist-mn">Middle</Field.FieldLabel>
						<Input id="assist-mn" bind:value={assistMiddleName} placeholder="D." class="rounded-xl h-9 text-xs" />
					</Field.Field>
					<Field.Field>
						<Field.FieldLabel for="assist-ln">Last Name *</Field.FieldLabel>
						<Input id="assist-ln" bind:value={assistLastName} placeholder="Cruz" required class="rounded-xl h-9 text-xs" />
					</Field.Field>
				</div>

				<div class="grid grid-cols-2 gap-2">
					<Field.Field>
						<Field.FieldLabel for="assist-em">Email</Field.FieldLabel>
						<Input id="assist-em" type="email" bind:value={assistEmail} placeholder="juan@example.com" class="rounded-xl h-9 text-xs" />
					</Field.Field>
					<Field.Field>
						<Field.FieldLabel for="assist-ph">Phone</Field.FieldLabel>
						<Input id="assist-ph" type="tel" bind:value={assistPhone} placeholder="+63 9..." class="rounded-xl h-9 text-xs" />
					</Field.Field>
				</div>

				<!-- Office Combobox -->
				<Field.Field>
					<Field.FieldLabel>Designated Office *</Field.FieldLabel>
					<Popover.Root bind:open={isAssistOfficeComboOpen}>
						<Popover.Trigger>
							<Button variant="outline" type="button" role="combobox" class="w-full justify-between rounded-xl h-10 text-xs font-bold border-border bg-background cursor-pointer">
								<span class="truncate">
									{assistSelectedOffice ? `${assistSelectedOffice.name} (${assistSelectedOffice.code})` : "-- Select Office --"}
								</span>
								<ChevronsUpDownIcon class="size-4 opacity-50 ml-2 shrink-0 pointer-events-none" />
							</Button>
						</Popover.Trigger>
						<Popover.Content align="start" sideOffset={6} class="w-[var(--bits-popover-anchor-width)] max-w-xs p-0 max-h-60 overflow-y-auto z-[2600] border-border bg-popover text-popover-foreground rounded-2xl shadow-2xl">
							<Command.Root class="w-full">
								<Command.Input placeholder="Search office..." class="h-10 text-xs px-3 border-b border-border/60" />
								<Command.List class="p-1 max-h-48 overflow-y-auto">
									<Command.Empty class="p-3 text-xs text-muted-foreground text-center">No office found.</Command.Empty>
									<Command.Group>
										{#each officesList as office}
											<Command.Item
												value={office.name}
												onSelect={() => {
													assistOfficeId = office.id;
													isAssistOfficeComboOpen = false;
												}}
												class="text-xs font-semibold cursor-pointer rounded-xl px-3 py-2 flex items-center justify-between hover:bg-muted/60"
											>
												<span>{office.name} ({office.code})</span>
												{#if assistOfficeId === office.id}
													<CheckIcon class="size-4 text-primary shrink-0 ml-2" />
												{/if}
											</Command.Item>
										{/each}
									</Command.Group>
								</Command.List>
							</Command.Root>
						</Popover.Content>
					</Popover.Root>
				</Field.Field>

				<Field.Field>
					<Field.FieldLabel for="assist-purp">Purpose of Visit *</Field.FieldLabel>
					<Input id="assist-purp" bind:value={assistPurpose} placeholder="e.g. Official Inquiry" required class="rounded-xl h-9 text-xs" />
				</Field.Field>

				<!-- Visitor Photo Capture / Upload -->
				<div class="flex flex-col gap-2 items-center p-3 rounded-2xl border border-border bg-muted/30 text-center">
					{#if assistPhotoUrl}
						<img src={assistPhotoUrl} alt="Visitor Snapshot" class="size-24 rounded-full object-cover border-2 border-primary/30 shadow-md" />
						<Button type="button" onclick={startAssistCamera} variant="outline" size="sm" class="text-xs font-bold rounded-xl h-7 gap-1 mt-1">
							<RefreshCwIcon class="size-3 pointer-events-none" />
							<span>Retake</span>
						</Button>
					{:else if isAssistCameraActive}
						<div class="relative size-36 rounded-2xl overflow-hidden bg-black border border-primary/40">
							<video bind:this={assistVideoElement} autoplay playsinline class="size-full object-cover"></video>
						</div>
						<canvas bind:this={assistCanvasElement} class="hidden"></canvas>
						<Button type="button" onclick={captureAssistSelfie} class="bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-8 gap-1 cursor-pointer mt-1">
							<CameraIcon class="size-3.5 pointer-events-none" />
							<span>Capture Photo</span>
						</Button>
					{:else}
						<div class="flex gap-2 w-full pt-1">
							<Button type="button" onclick={startAssistCamera} variant="outline" class="flex-1 text-xs font-bold rounded-xl h-9 gap-1 cursor-pointer">
								<CameraIcon class="size-3.5 pointer-events-none" />
								<span>Desk Camera</span>
							</Button>
							<label class="flex-1 flex items-center justify-center gap-1 px-3 h-9 rounded-xl border border-border bg-card hover:bg-muted/40 font-bold text-xs cursor-pointer">
								<UploadIcon class="size-3.5 text-primary pointer-events-none" />
								<span>Upload File</span>
								<input type="file" accept="image/*" onchange={handleAssistFileUpload} class="hidden" />
							</label>
						</div>
					{/if}
				</div>

				<Dialog.Footer class="pt-3 border-t border-border/60">
					<Button type="button" onclick={() => isAssistModalOpen = false} variant="outline" class="text-xs font-semibold rounded-xl h-10 cursor-pointer">
						Cancel
					</Button>
					<Button type="submit" disabled={isSubmittingAssist} class="bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-10 cursor-pointer shadow-md">
						<span>{isSubmittingAssist ? 'Processing...' : 'Register & Check In'}</span>
					</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<!-- REJECTION REASON DIALOG -->
<Dialog.Root bind:open={isRejecting}>
	<Dialog.Portal>
		<Dialog.Content class="z-[2600] max-w-sm border-border bg-card text-card-foreground shadow-2xl rounded-3xl">
			<Dialog.Header>
				<Dialog.Title class="text-base font-black text-destructive flex items-center gap-2">
					<UserXIcon class="size-5 pointer-events-none" />
					<span>Reject Visitor Entry</span>
				</Dialog.Title>
				<Dialog.Description class="text-xs text-muted-foreground">
					Specify the reason for refusing visitor entry at the security gate.
				</Dialog.Description>
			</Dialog.Header>

			<Field.Field class="py-2">
				<Field.FieldLabel for="rej-reason">Rejection Reason</Field.FieldLabel>
				<Input id="rej-reason" bind:value={rejectionReason} placeholder="e.g. Invalid ID document / Security Policy" class="rounded-xl h-9 text-xs" />
			</Field.Field>

			<Dialog.Footer class="pt-2 border-t border-border/60">
				<Button onclick={() => isRejecting = false} variant="outline" class="text-xs font-semibold rounded-xl h-9 cursor-pointer">Cancel</Button>
				<Button onclick={confirmReject} variant="destructive" class="text-xs font-extrabold rounded-xl h-9 cursor-pointer">Confirm Reject</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
