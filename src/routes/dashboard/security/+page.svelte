<script lang="ts">
	import { getContext, onMount, onDestroy } from 'svelte';
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Field from "$lib/components/ui/field/index.js";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import * as Table from "$lib/components/ui/table/index.js";
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { toast } from 'svelte-sonner';
	import { MOCK_BUILDINGS, verifyVisitor, checkoutLocalVisitor } from '$lib/supabase';
	
	// Lucide Icons
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import ScanFaceIcon from "@lucide/svelte/icons/scan-face";
	import UserCheckIcon from "@lucide/svelte/icons/user-check";
	import UserXIcon from "@lucide/svelte/icons/user-x";
	import LogOutIcon from "@lucide/svelte/icons/log-out";
	import QrCodeIcon from "@lucide/svelte/icons/qr-code";
	import CheckCircleIcon from "@lucide/svelte/icons/check-circle";
	import MapPinIcon from "@lucide/svelte/icons/map-pin";
	import ListIcon from "@lucide/svelte/icons/list";
	import LayoutGridIcon from "@lucide/svelte/icons/layout-grid";
	import ActivityIcon from "@lucide/svelte/icons/activity";
	import RadioIcon from "@lucide/svelte/icons/radio";
	import SearchIcon from "@lucide/svelte/icons/search";
	import AlertTriangleIcon from "@lucide/svelte/icons/alert-triangle";
	import Building2Icon from "@lucide/svelte/icons/building-2";
	import EyeIcon from "@lucide/svelte/icons/eye";
	import MapIcon from "@lucide/svelte/icons/map";
	import LockIcon from "@lucide/svelte/icons/lock";
	import UsersIcon from "@lucide/svelte/icons/users";
	import ClockIcon from "@lucide/svelte/icons/clock";

	const dashboardContext = getContext<any>("dashboard-state");
	let visitors = $derived(dashboardContext.visitors);

	// Display mode states
	let activeTab = $state<'map' | 'visitors'>('map');
	let visitorViewMode = $state<'table' | 'grid'>('table');
	let searchQuery = $state('');
	let selectedBuildingFilter = $state<string | null>(null);

	// Scanner simulator
	let scanInput = $state('');
	let scannedVisitor: any = $state(null);

	// Rejection Dialog state
	let isRejecting = $state(false);
	let rejectingVisitorId = $state('');
	let rejectionReason = $state('');

	// Leaflet map references
	let mapContainer: HTMLDivElement;
	let leafMap: any = $state(null);
	let leafletInstance: any = $state(null);
	let visitorMarkers: Record<string, any> = {};
	let isSimulatingMovement = $state(true);
	let visitorPositions: Record<string, { lat: number; lng: number; dLat: number; dLng: number }> = {};
	let movementTimer: any = null;

	// Campus Bounds from static/prev-proj/map.js
	const campusBoundsCoords = [
		[9.893421456778755, 123.8815211010603],
		[9.895647770829878, 123.88369296680753]
	];

	// Dynamic derived listings directly from database context
	let liveMonitorList = $derived(
		visitors.filter((v: any) => v.status === 'checked_in' && v.verificationStatus !== 'rejected')
	);

	let filteredLiveMonitorList = $derived(
		liveMonitorList.filter((v: any) => {
			if (selectedBuildingFilter && v.buildingId !== selectedBuildingFilter) return false;
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

	let pendingVerificationQueue = $derived(
		visitors.filter((v: any) => v.verificationStatus === 'pending')
	);

	// Security Event Audit Log Feed
	let securityAuditLog = $derived.by(() => {
		const events = liveMonitorList.slice(0, 5).map((v: any) => ({
			id: v.id,
			time: formatTime(v.checkInTime),
			title: `${v.fullName} Entered Gate`,
			detail: `${v.buildingName || 'Campus'} • ${v.passCode}`,
			type: 'entry' as const
		}));

		if (pendingVerificationQueue.length > 0) {
			events.unshift({
				id: 'pending-alert',
				time: 'Just now',
				title: `${pendingVerificationQueue.length} Pending Approval`,
				detail: 'Gate Queue Requires Security Action',
				type: 'alert' as const
			});
		}

		return events;
	});

	// Initialize Leaflet Map on client mount
	onMount(async () => {
		if (typeof window === 'undefined') return;

		let L = (window as any).L;
		if (!L) {
			try {
				const leafletModule = await import('leaflet');
				L = leafletModule.default || leafletModule;
			} catch (e) {
				console.error("Failed to dynamically import Leaflet module:", e);
			}
		}

		if (!L) {
			console.warn("Leaflet library unavailable, skipping Leaflet map render");
			return;
		}

		leafletInstance = L;

		if (!mapContainer) return;

		const bounds = L.latLngBounds(campusBoundsCoords[0], campusBoundsCoords[1]);

		const map = L.map(mapContainer, {
			zoomControl: true,
			maxBounds: bounds,
			maxBoundsViscosity: 1.0,
			minZoom: 18,
			maxZoom: 22
		}).setView([9.894414742474977, 123.88258093049176], 19);

		const osmLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: '&copy; OpenStreetMap contributors',
			maxNativeZoom: 19,
			maxZoom: 22
		}).addTo(map);

		const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
			attribution: "Tiles &copy; Esri &mdash; Source: Esri",
			maxNativeZoom: 18,
			maxZoom: 22
		});

		const overlayImage = "/campusMap-adjusted.png";
		const campusOverlay = L.imageOverlay(overlayImage, bounds, {
			opacity: 1.0,
			interactive: false,
			zIndex: 300
		}).addTo(map);

		L.control.layers(
			{ "OpenStreetMap": osmLayer, "ESRI Satellite": satelliteLayer },
			{ "3D Campus Overlay": campusOverlay },
			{ position: "topright" }
		).addTo(map);

		leafMap = map;

		refreshMapMarkers();

		// Live GPS Movement Simulation Loop (Runs every 1.5s)
		movementTimer = setInterval(() => {
			if (!isSimulatingMovement || !leafMap) return;

			liveMonitorList.forEach((v: any) => {
				if (!visitorPositions[v.id]) {
					refreshMapMarkers();
				}

				const pos = visitorPositions[v.id];
				if (pos) {
					let nextLat = pos.lat + pos.dLat;
					let nextLng = pos.lng + pos.dLng;

					// Bounce within campus bounds
					if (nextLat < 9.8936 || nextLat > 9.8954) pos.dLat = -pos.dLat;
					if (nextLng < 123.8817 || nextLng > 123.8834) pos.dLng = -pos.dLng;

					pos.lat = pos.lat + pos.dLat;
					pos.lng = pos.lng + pos.dLng;

					if (visitorMarkers[v.id]) {
						visitorMarkers[v.id].setLatLng([pos.lat, pos.lng]);
					} else {
						refreshMapMarkers();
					}
				}
			});
		}, 1500);

		setTimeout(() => map.invalidateSize(), 200);
	});

	onDestroy(() => {
		if (movementTimer) clearInterval(movementTimer);
	});

	$effect(() => {
		if (leafMap && liveMonitorList) {
			refreshMapMarkers();
		}
	});

	function refreshMapMarkers() {
		if (!leafMap || typeof window === 'undefined') return;
		const L = leafletInstance || (window as any).L;
		if (!L) return;

		const seenIds = new Set<string>();

		liveMonitorList.forEach((v: any, idx: number) => {
			seenIds.add(v.id);

			if (!visitorPositions[v.id]) {
				const bld = MOCK_BUILDINGS.find(b => b.id === v.buildingId || b.name === v.buildingName);
				const baseLat = v.lat || bld?.lat || (9.894414 + (idx * 0.0003));
				const baseLng = v.lng || bld?.lng || (123.882580 + (idx * 0.0003));
				visitorPositions[v.id] = {
					lat: baseLat,
					lng: baseLng,
					dLat: (Math.random() - 0.5) * 0.00005,
					dLng: (Math.random() - 0.5) * 0.00005
				};
			}

			const pos = visitorPositions[v.id];
			const userColor = getUserColor(v.id);
			const initials = getInitials(v.fullName);

			const iconHtml = `
				<div class="visitor-marker-container group relative flex items-center justify-center transition-transform duration-200" id="marker-${v.id}">
					<span class="animate-ping absolute inline-flex size-7 rounded-full opacity-40" style="background-color: ${userColor};"></span>
					<div class="relative flex size-7 items-center justify-center rounded-full border-2 border-white shadow-md transition-all group-hover:scale-125" style="background-color: ${userColor};">
						<span class="text-[10px] font-black text-white leading-none">${initials}</span>
					</div>
				</div>
			`;

			if (visitorMarkers[v.id]) {
				visitorMarkers[v.id].setLatLng([pos.lat, pos.lng]);
			} else {
				const marker = L.marker([pos.lat, pos.lng], {
					icon: L.divIcon({
						className: "bg-transparent border-none",
						html: iconHtml,
						iconSize: [28, 28],
						iconAnchor: [14, 14]
					})
				}).bindPopup(`
					<div class="flex flex-col gap-1 p-1 font-sans">
						<div class="font-black text-sm text-foreground">${v.fullName}</div>
						<div class="font-mono text-xs font-bold text-primary">${v.passCode}</div>
						<div class="text-xs text-muted-foreground">${v.buildingName || 'Campus'} ${v.roomNumber ? '• ' + v.roomNumber : ''}</div>
					</div>
				`).addTo(leafMap);

				visitorMarkers[v.id] = marker;
			}
		});

		Object.keys(visitorMarkers).forEach(id => {
			if (!seenIds.has(id)) {
				leafMap.removeLayer(visitorMarkers[id]);
				delete visitorMarkers[id];
			}
		});
	}

	function focusBuildingOnMap(bld: any) {
		activeTab = 'map';
		if (leafMap && bld.lat && bld.lng) {
			leafMap.setView([bld.lat, bld.lng], 20, { animate: true });
			toast.info(`Map camera focused on ${bld.name}.`);
		}
	}

	function focusVisitorOnMap(v: any) {
		activeTab = 'map';
		if (leafMap) {
			const pos = visitorPositions[v.id] || { lat: v.lat || 9.894414, lng: v.lng || 123.882580 };
			leafMap.setView([pos.lat, pos.lng], 20, { animate: true });
			if (visitorMarkers[v.id]) {
				visitorMarkers[v.id].openPopup();
			}
		}
	}

	function getInitials(name: string): string {
		if (!name) return "V";
		const parts = name.trim().split(/\s+/);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
		}
		return parts[0].substring(0, 2).toUpperCase();
	}

	function getUserColor(userId: string): string {
		if (!userId) return "#3b82f6";
		let hash = 0;
		for (let i = 0; i < userId.length; i++) {
			hash = userId.charCodeAt(i) + ((hash << 5) - hash);
		}
		const hue = Math.abs(hash) % 360;
		return `hsl(${hue}, 75%, 45%)`;
	}

	function formatTime(isoString: string): string {
		if (!isoString) return '-';
		return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function getColorVar(str: string): string {
		const chartVars = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'];
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}
		const index = Math.abs(hash) % chartVars.length;
		return chartVars[index];
	}

	async function handleCheckout(id: string) {
		const updated = await checkoutLocalVisitor(id);
		if (updated) {
			toast.info(`Visitor ${updated.fullName} checked out successfully.`);
			await dashboardContext.loadData();
			if (scannedVisitor && scannedVisitor.id === id) {
				scannedVisitor = { ...scannedVisitor, status: 'checked_out', checkOutTime: new Date().toISOString() };
			}
		}
	}

	async function handleApprove(id: string) {
		const updated = await verifyVisitor(id, 'approved');
		if (updated) {
			toast.success(`Visitor ${updated.fullName} approved and verified.`);
			await dashboardContext.loadData();
		}
	}

	function triggerReject(id: string) {
		rejectingVisitorId = id;
		rejectionReason = '';
		isRejecting = true;
	}

	async function handleConfirmReject() {
		if (!rejectionReason.trim()) {
			toast.error('Please enter a rejection reason.');
			return;
		}
		const updated = await verifyVisitor(rejectingVisitorId, 'rejected', rejectionReason);
		if (updated) {
			toast.error(`Visitor ${updated.fullName} pass has been declined.`);
			isRejecting = false;
			await dashboardContext.loadData();
		}
	}

	function handleSimulateScan(e: SubmitEvent) {
		e.preventDefault();
		if (!scanInput.trim()) return;

		const code = scanInput.trim().toUpperCase();
		const match = visitors.find((v: any) => v.passCode.toUpperCase() === code || v.id === code);
		
		if (match) {
			scannedVisitor = match;
			if (match.status === 'checked_in') {
				toast.success(`Scan Validated: ${match.fullName} is registered to visit ${match.buildingName || 'General Building'}.`);
			} else {
				toast.info(`Scan Record: ${match.fullName} has checked out.`);
			}
		} else {
			scannedVisitor = null;
			toast.error('No visitor pass found with code: ' + code);
		}
	}
</script>

{#snippet buildingBadge(buildingName: string)}
	{@const colorVar = getColorVar(buildingName)}
	<Badge
		style="background-color: oklch(from var({colorVar}) l c h / 0.12); border-color: oklch(from var({colorVar}) l c h / 0.25); color: var({colorVar});"
		variant="outline"
		class="text-[11px] font-bold border transition-colors shadow-xs rounded-full px-2.5"
	>
		{buildingName}
	</Badge>
{/snippet}

{#snippet statusBadge(visitor: any)}
	{#if visitor.status === 'checked_out'}
		<Badge variant="secondary" class="text-[10px] font-bold">
			Checked Out
		</Badge>
	{:else if visitor.verificationStatus === 'rejected'}
		<Badge variant="destructive" class="text-[10px] font-bold">
			Declined
		</Badge>
	{:else if visitor.roomCheckInTime}
		<Badge variant="outline" class="text-[10px] font-bold border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10">
			In Office
		</Badge>
	{:else}
		<Badge variant="outline" class="text-[10px] font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
			On Campus
		</Badge>
	{/if}
{/snippet}

<div class="flex flex-col gap-6 p-6 md:p-8">
	<!-- Page Header Console Bar -->
	<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-border/60">
		<div class="flex items-center gap-3">
			<div class="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
				<ShieldCheckIcon class="size-6 pointer-events-none" />
			</div>
			<div>
				<div class="flex items-center gap-2">
					<h1 class="text-xl md:text-2xl font-black text-foreground tracking-tight">Security GIS Command Console</h1>
					<Badge variant="outline" class="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] uppercase border-emerald-500/30 px-2.5 gap-1">
						<span class="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
						
					</Badge>
				</div>
				<p class="text-xs text-muted-foreground leading-relaxed font-semibold">Live GIS map telemetry with image overlay, real-time visitor positioning, and gate pass verification.</p>
			</div>
		</div>

		<!-- Status Indicators -->
		<div class="flex items-center gap-2 flex-wrap">
			<div class="px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold flex items-center gap-2">
				<ActivityIcon class="size-3.5 text-emerald-500 pointer-events-none" />
				<span class="text-muted-foreground">Onsite Visitors:</span>
				<span class="font-black text-foreground">{liveMonitorList.length}</span>
			</div>
			<div class="px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold flex items-center gap-2">
				<RadioIcon class="size-3.5 text-amber-500 pointer-events-none animate-pulse" />
				<span class="text-muted-foreground">Pending Queue:</span>
				<span class="font-black text-amber-600 dark:text-amber-400">{pendingVerificationQueue.length}</span>
			</div>
		</div>
	</div>

	<!-- 3-Column Architectural GIS Monitor Dashboard -->
	<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
		<!-- COLUMN 1: High-Utility Security Telemetry & Audit Operations (3 Cols) -->
		<div class="lg:col-span-3 flex flex-col gap-4">
			<!-- Security Telemetry & Operations Sentinel -->
			<!-- <Card.Root class="border-border shadow-xs rounded-2xl bg-card">
				<Card.Header class="pb-3">
					<div class="flex items-center justify-between">
						<Card.Title class="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
							<ShieldCheckIcon class="size-4 text-primary pointer-events-none" />
							<span>Security Telemetry</span>
						</Card.Title>
						<Badge variant="outline" class="text-[10px] font-mono font-bold">Live</Badge>
					</div>
					<Card.Description class="text-[11px]">Sector operational status and guard posts.</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-col gap-3 text-xs font-semibold">
					<div class="p-2.5 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<LockIcon class="size-3.5 text-emerald-500 pointer-events-none" />
							<span class="text-foreground">Gate 1 Main Entry</span>
						</div>
						<Badge variant="outline" class="text-[10px] font-bold border-emerald-500/30 text-emerald-600 bg-emerald-500/10">Active</Badge>
					</div>

					<div class="p-2.5 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<UsersIcon class="size-3.5 text-primary pointer-events-none" />
							<span class="text-foreground">Guard Patrol Duty</span>
						</div>
						<span class="font-bold text-foreground">3 Officers</span>
					</div>

					<div class="p-2.5 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<ActivityIcon class="size-3.5 text-indigo-500 pointer-events-none" />
							<span class="text-foreground">Campus Alarms</span>
						</div>
						<span class="font-extrabold text-emerald-600 dark:text-emerald-400">Nominal</span>
					</div>
				</Card.Content>
			</Card.Root> -->

			<!-- Live Security Audit Log Card -->
			<Card.Root class="border-border shadow-xs rounded-2xl bg-card">
				<Card.Header class="pb-3">
					<div class="flex items-center justify-between">
						<Card.Title class="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
							<ClockIcon class="size-4 text-primary pointer-events-none" />
							<span>Security Audit Log</span>
						</Card.Title>
						<Badge variant="secondary" class="text-[9px] font-mono font-bold">Real-time</Badge>
					</div>
					<Card.Description class="text-[11px]">Chronological gate telemetry event feed.</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
					{#each securityAuditLog as log}
						<div class="p-2.5 rounded-xl bg-muted/30 border border-border/60 flex flex-col gap-1 text-[11px] font-semibold">
							<div class="flex items-center justify-between">
								<span class="font-bold text-foreground">{log.title}</span>
								<span class="font-mono text-[10px] text-muted-foreground">{log.time}</span>
							</div>
							<span class="text-[10px] text-muted-foreground font-medium">{log.detail}</span>
						</div>
					{/each}
				</Card.Content>
			</Card.Root>

			<!-- Campus Landmarks Camera Focus Directory Card -->
			<Card.Root class="border-border shadow-xs rounded-2xl bg-card">
				<Card.Header class="pb-3">
					<div class="flex items-center justify-between">
						<Card.Title class="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
							<Building2Icon class="size-4 text-primary pointer-events-none" />
							<span>Campus Landmarks</span>
						</Card.Title>
						<Badge variant="outline" class="text-[10px] font-mono font-bold">{MOCK_BUILDINGS.length}</Badge>
					</div>
					<Card.Description class="text-[11px]">One-click map camera focus controls.</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-col gap-2">
					{#each MOCK_BUILDINGS as bld}
						<div class="p-2.5 rounded-xl border border-border/80 bg-card hover:bg-muted/20 transition-all flex items-center justify-between text-xs font-semibold">
							<div>
								<div class="font-extrabold text-foreground">{bld.name}</div>
								<div class="text-[10px] text-muted-foreground">{bld.code} • {bld.floors} Floors</div>
							</div>
							<Button 
								onclick={() => focusBuildingOnMap(bld)} 
								variant="outline" 
								size="sm" 
								class="h-7 text-[10px] font-bold rounded-lg cursor-pointer"
							>
								<EyeIcon data-icon="inline-start" />
								<span>Focus</span>
							</Button>
						</div>
					{/each}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- COLUMN 2: Main Center Leaflet Map Viewport & Visitors List (6 Cols) -->
		<div class="lg:col-span-6 flex flex-col gap-6">
			<!-- Pending Verification Alert Banner -->
			{#if pendingVerificationQueue.length > 0}
				<div class="flex flex-col gap-3">
					<div class="flex items-center justify-between">
						<h2 class="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
							<AlertTriangleIcon class="size-4 pointer-events-none" />
							<span>Pending Gate Verifications ({pendingVerificationQueue.length})</span>
						</h2>
					</div>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
						{#each pendingVerificationQueue as visitor}
							<Card.Root class="border-amber-500/30 bg-amber-500/[0.03] shadow-xs rounded-2xl">
								<Card.Content class="p-3.5 flex flex-col gap-3 font-semibold text-xs">
									<div class="flex items-center gap-3">
										{#if visitor.photoUrl}
											<img src={visitor.photoUrl} alt="Selfie" class="size-10 rounded-full object-cover border-2 border-amber-400/60 shadow-xs" />
										{:else}
											<div class="size-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-[10px] font-black uppercase">Photo</div>
										{/if}
										<div>
											<div class="font-black text-sm text-foreground">{visitor.fullName}</div>
											<div class="text-xs font-mono font-black text-primary">{visitor.passCode}</div>
										</div>
									</div>

									<div class="text-[11px] bg-card p-2.5 rounded-xl border border-border/80 flex flex-col gap-1 font-semibold">
										<div><span class="text-muted-foreground">Destination:</span> <span class="font-bold text-foreground">{visitor.buildingName}</span></div>
										<div><span class="text-muted-foreground">Purpose:</span> <span class="text-foreground">{visitor.purpose}</span></div>
									</div>

									<div class="flex gap-2">
										<Button onclick={() => handleApprove(visitor.id)} class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-1.5 rounded-xl flex items-center justify-center gap-1 shadow-xs cursor-pointer h-8">
											<UserCheckIcon data-icon="inline-start" />
											<span>Approve</span>
										</Button>
										<Button onclick={() => triggerReject(visitor.id)} variant="destructive" class="flex-1 font-extrabold text-xs py-1.5 rounded-xl flex items-center justify-center gap-1 shadow-xs cursor-pointer h-8">
											<UserXIcon data-icon="inline-start" />
											<span>Decline</span>
										</Button>
									</div>
								</Card.Content>
							</Card.Root>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Primary View Switcher: Live Leaflet GIS Map vs Visitors List Table -->
			<Tabs.Root value={activeTab} onValueChange={(val) => { activeTab = val as 'map' | 'visitors'; if (val === 'map' && leafMap) setTimeout(() => leafMap.invalidateSize(), 150); }} class="w-full flex flex-col gap-4">
				<div class="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-border/60">
					<Tabs.List class="bg-muted/60 p-1 rounded-xl">
						<Tabs.Trigger value="map" class="text-xs font-bold px-4 py-1.5 rounded-lg gap-2 cursor-pointer">
							<MapIcon class="size-3.5 pointer-events-none" />
							<span>Live GIS Map Feed</span>
						</Tabs.Trigger>
						<Tabs.Trigger value="visitors" class="text-xs font-bold px-4 py-1.5 rounded-lg gap-2 cursor-pointer">
							<ListIcon class="size-3.5 pointer-events-none" />
							<span>Active Visitors Stream ({filteredLiveMonitorList.length})</span>
						</Tabs.Trigger>
					</Tabs.List>

					{#if activeTab === 'visitors'}
						<div class="flex items-center gap-2 w-full sm:w-auto">
							<div class="relative flex-grow sm:w-48">
								<SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
								<Input 
									type="text" 
									placeholder="Search name or pass..." 
									bind:value={searchQuery} 
									class="pl-9 h-8 text-xs rounded-xl"
								/>
							</div>

							<div class="flex items-center p-0.5 rounded-xl border border-border bg-muted/40">
								<Button 
									variant={visitorViewMode === 'table' ? 'secondary' : 'ghost'} 
									size="icon" 
									onclick={() => visitorViewMode = 'table'} 
									class="size-7 rounded-lg cursor-pointer"
								>
									<ListIcon class="size-3.5 pointer-events-none" />
								</Button>
								<Button 
									variant={visitorViewMode === 'grid' ? 'secondary' : 'ghost'} 
									size="icon" 
									onclick={() => visitorViewMode = 'grid'} 
									class="size-7 rounded-lg cursor-pointer"
								>
									<LayoutGridIcon class="size-3.5 pointer-events-none" />
								</Button>
							</div>
						</div>
					{/if}
				</div>

				<!-- TAB CONTENT 1: Leaflet Interactive GIS Map with /campusMap-adjusted.png Overlay -->
				<Tabs.Content value="map" class="mt-0">
					<Card.Root class="border-border/80 shadow-md rounded-2xl overflow-hidden bg-card flex flex-col">
						<Card.Header class="px-4 border-b border-border/60  flex-row items-center justify-between flex-wrap gap-2 space-y-0">
							<div class="flex items-center gap-2">
								<Badge variant="default" class="font-mono font-extrabold text-[10px] gap-1">
									<RadioIcon class="size-3 pointer-events-none animate-pulse" />
									<span>3D OVERLAY GIS</span>
								</Badge>
								<span class="text-xs text-muted-foreground font-semibold">Campus map image overlay & live visitor markers</span>
							</div>

							<div class="flex items-center gap-3">
								<Button 
									onclick={() => isSimulatingMovement = !isSimulatingMovement} 
									variant="outline" 
									size="sm" 
									class="h-7 text-[10px] font-bold rounded-lg gap-1 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
								>
									<ActivityIcon data-icon="inline-start" />
									<span>{isSimulatingMovement ? 'Pause Live Movement' : 'Resume Live Movement'}</span>
								</Button>
								<div class="text-[11px] font-mono text-muted-foreground font-bold hidden sm:block">
									Bounds: 9.8944° N, 123.8825° E
								</div>
							</div>
						</Card.Header>

						<!-- Leaflet Container -->
						<Card.Content class="p-0">
							<div class="relative w-full h-[480px] bg-slate-950 rounded-b-2xl overflow-hidden">
								<div bind:this={mapContainer} class="size-full"></div>
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>

				<!-- TAB CONTENT 2: Active Visitors Stream Table / Grid -->
				<Tabs.Content value="visitors" class="mt-0">
					{#if filteredLiveMonitorList.length === 0}
						<Card.Root class="p-12 text-center border-dashed border-border text-muted-foreground text-xs font-semibold rounded-2xl bg-card">
							<Card.Content class="p-0">
								{#if searchQuery.trim()}
									No active visitors match your search term "{searchQuery}".
								{:else}
									No active verified visitors currently on campus.
								{/if}
							</Card.Content>
						</Card.Root>
					{:else if visitorViewMode === 'table'}
						<div class="border border-border/80 rounded-2xl overflow-hidden bg-card shadow-xs">
							<Table.Root>
								<Table.Header class="bg-muted/30">
									<Table.Row>
										<Table.Head class="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Visitor Profile</Table.Head>
										<Table.Head class="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Pass Code</Table.Head>
										<Table.Head class="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Destination</Table.Head>
										<Table.Head class="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Gate Entry</Table.Head>
										<Table.Head class="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Status</Table.Head>
										<Table.Head class="text-[10px] font-black uppercase text-muted-foreground tracking-wider text-right">Actions</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each filteredLiveMonitorList as visitor (visitor.id)}
										<Table.Row class="hover:bg-muted/20 transition-colors">
											<Table.Cell class="font-semibold text-xs py-3">
												<div class="flex items-center gap-3">
													{#if visitor.photoUrl}
														<img src={visitor.photoUrl} alt="Selfie" class="size-9 rounded-full object-cover border border-primary/20 shrink-0" />
													{:else}
														<div class="size-9 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">Pic</div>
													{/if}
													<div>
														<div class="font-extrabold text-foreground">{visitor.fullName}</div>
														<div class="text-[10px] text-muted-foreground">{visitor.email || visitor.phone}</div>
													</div>
												</div>
											</Table.Cell>

											<Table.Cell class="py-3">
												<span class="font-mono font-black text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
													{visitor.passCode}
												</span>
											</Table.Cell>

											<Table.Cell class="py-3">
												<div class="flex flex-col gap-0.5">
													{@render buildingBadge(visitor.buildingName || 'General')}
													{#if visitor.roomNumber}
														<span class="text-[10px] text-muted-foreground font-bold pl-1">Room: {visitor.roomNumber}</span>
													{/if}
												</div>
											</Table.Cell>

											<Table.Cell class="py-3 font-mono text-xs font-bold text-foreground">
												{formatTime(visitor.checkInTime)}
											</Table.Cell>

											<Table.Cell class="py-3">
												{@render statusBadge(visitor)}
											</Table.Cell>

											<Table.Cell class="py-3 text-right">
												<div class="flex items-center justify-end gap-1.5">
													<Button 
														onclick={() => focusVisitorOnMap(visitor)} 
														variant="outline" 
														size="sm" 
														class="text-xs font-bold rounded-xl h-8 gap-1 cursor-pointer"
													>
														<EyeIcon data-icon="inline-start" />
														<span>Focus</span>
													</Button>
													<Button 
														onclick={() => handleCheckout(visitor.id)} 
														variant="destructive" 
														size="sm" 
														class="text-xs font-bold rounded-xl h-8 gap-1 shadow-xs cursor-pointer"
													>
														<LogOutIcon data-icon="inline-start" />
														<span>Out</span>
													</Button>
												</div>
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</div>
					{:else}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							{#each filteredLiveMonitorList as visitor (visitor.id)}
								<Card.Root class="shadow-xs border-border/80 hover:shadow-md transition-all rounded-2xl bg-card">
									<Card.Content class="p-4 flex flex-col gap-3 font-semibold text-xs">
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-2.5">
												{#if visitor.photoUrl}
													<img src={visitor.photoUrl} alt="Selfie" class="size-10 rounded-full object-cover border border-primary/30" />
												{:else}
													<div class="size-10 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">Pic</div>
												{/if}
												<div>
													<div class="font-bold text-sm text-foreground">{visitor.fullName}</div>
													<div class="text-[10px] text-muted-foreground leading-none mt-0.5">{visitor.email}</div>
												</div>
											</div>
											{@render statusBadge(visitor)}
										</div>

										<div class="grid grid-cols-2 gap-2 text-[11px] bg-muted/40 p-3 rounded-xl border border-border/80">
											<div>
												<span class="text-muted-foreground block text-[9px] uppercase font-bold tracking-wider">Pass Code</span>
												<span class="font-mono font-black text-primary text-xs">{visitor.passCode}</span>
											</div>
											<div>
												<span class="text-muted-foreground block text-[9px] uppercase font-bold tracking-wider">Gate Entry</span>
												<span class="font-mono text-foreground font-bold">{formatTime(visitor.checkInTime)}</span>
											</div>
										</div>

										<div class="flex gap-2">
											<Button onclick={() => focusVisitorOnMap(visitor)} variant="outline" class="flex-1 text-xs font-bold rounded-xl cursor-pointer h-9 gap-1">
												<EyeIcon data-icon="inline-start" />
												<span>Focus Map</span>
											</Button>
											<Button onclick={() => handleCheckout(visitor.id)} class="flex-1 bg-destructive hover:bg-destructive/95 text-destructive-foreground text-xs font-bold rounded-xl flex items-center justify-center gap-1 shadow-xs cursor-pointer h-9">
												<LogOutIcon data-icon="inline-start" />
												<span>Check Out</span>
											</Button>
										</div>
									</Card.Content>
								</Card.Root>
							{/each}
						</div>
					{/if}
				</Tabs.Content>
			</Tabs.Root>
		</div>

		<!-- COLUMN 3: Gate Pass Scanner Terminal (3 Cols) -->
		<div class="lg:col-span-3 flex flex-col gap-6">
			<Card.Root class="border-border/80 shadow-md rounded-2xl bg-card">
				<Card.Header>
					<Card.Title class="text-base font-black text-foreground flex items-center gap-2">
						<QrCodeIcon class="size-4 text-primary pointer-events-none" />
						Scan Gate Pass QR
					</Card.Title>
					<Card.Description class="text-xs text-muted-foreground font-semibold">Simulate barcode scanner sweeps at gate terminals.</Card.Description>
				</Card.Header>
				<Card.Content class="flex flex-col gap-4">
					<form onsubmit={handleSimulateScan} class="flex flex-col gap-4">
						<Field.FieldGroup class="flex flex-col gap-3">
							<Field.Field>
								<Field.FieldLabel for="scan-input" class="text-xs font-extrabold uppercase text-muted-foreground tracking-wider">Pass Code / Scan Input</Field.FieldLabel>
								<div class="flex gap-2 mt-1">
									<Input
										id="scan-input"
										type="text"
										placeholder="e.g. VP-8921"
										bind:value={scanInput}
										required
										class="font-mono text-sm tracking-widest h-10 rounded-xl"
									/>
									<Button type="submit" class="bg-primary hover:bg-primary/95 text-primary-foreground font-extrabold text-xs px-4 h-10 rounded-xl cursor-pointer">
										Scan
									</Button>
								</div>
							</Field.Field>
						</Field.FieldGroup>

						<Separator />

						<div class="flex flex-col gap-2 font-semibold">
							<div class="text-xs font-extrabold text-foreground uppercase tracking-wider">Simulate Quick Scans:</div>
							<div class="flex flex-wrap gap-1.5">
								{#each liveMonitorList.slice(0, 4) as vis}
									<Button onclick={() => { scanInput = vis.passCode; handleSimulateScan(new SubmitEvent('submit')); }} variant="outline" size="sm" class="text-xs font-mono rounded-xl h-8 border-border/85 cursor-pointer">
										{vis.passCode}
									</Button>
								{/each}
							</div>
						</div>
					</form>
				</Card.Content>
			</Card.Root>

			<!-- Scanner Terminal Output -->
			<Card.Root class="border-border/80 shadow-md rounded-2xl overflow-hidden bg-muted/[0.15]">
				<Card.Header class="pb-2">
					<Card.Title class="text-xs font-black uppercase text-foreground">Terminal Telemetry Output</Card.Title>
				</Card.Header>
				<Card.Content class="p-5 flex flex-col gap-4 items-center justify-center min-h-[240px]">
					{#if scannedVisitor}
						<div class="w-full flex flex-col gap-3 items-center text-center font-semibold">
							{#if scannedVisitor.photoUrl}
								<img src={scannedVisitor.photoUrl} alt="Selfie" class="size-20 rounded-full object-cover border-4 border-primary/20 shadow-md" />
							{:else}
								<div class="size-20 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">No Selfie</div>
							{/if}

							<div class="space-y-0.5">
								<div class="font-black text-base text-foreground leading-tight">{scannedVisitor.fullName}</div>
								<div class="text-xs font-mono font-black text-primary">{scannedVisitor.passCode}</div>
							</div>

							<div class="w-full grid grid-cols-2 gap-2 text-left text-[11px] bg-card p-3 rounded-xl border border-border/80 font-semibold">
								<div><span class="text-muted-foreground text-[9px] block uppercase font-bold tracking-wider">Destination</span><div class="font-bold truncate">{scannedVisitor.buildingName}</div></div>
								<div><span class="text-muted-foreground text-[9px] block uppercase font-bold tracking-wider">Status</span><div>{@render statusBadge(scannedVisitor)}</div></div>
							</div>

							{#if scannedVisitor.status === 'checked_in'}
								<Button onclick={() => handleCheckout(scannedVisitor!.id)} class="w-full bg-destructive hover:bg-destructive/95 text-destructive-foreground font-extrabold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer h-9">
									<LogOutIcon data-icon="inline-start" />
									<span>Validate Exit Check-Out</span>
								</Button>
							{:else}
								<div class="text-xs text-muted-foreground font-bold flex items-center gap-1.5 p-2 rounded-xl bg-emerald-500/[0.04] border border-emerald-200/30">
									<CheckCircleIcon class="size-4 text-emerald-600 pointer-events-none" />
									<span>Pass validation complete. Exited.</span>
								</div>
							{/if}
						</div>
					{:else}
						<div class="text-center text-muted-foreground space-y-2 py-6 font-semibold">
							<QrCodeIcon class="size-10 mx-auto text-primary/30 animate-pulse pointer-events-none" />
							<div class="font-extrabold text-xs text-foreground uppercase tracking-widest">Waiting for Pass scan</div>
							<p class="text-xs max-w-[180px] mx-auto text-muted-foreground/80 leading-relaxed font-semibold">Enter a pass code or click a simulation button above.</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>

<!-- Rejection Dialog Overlay -->
<Dialog.Root bind:open={isRejecting}>
	<Dialog.Content class="max-w-md border-destructive/40 shadow-2xl rounded-2xl">
		<Dialog.Header>
			<Dialog.Title class="text-destructive font-black text-left">Decline Visitor Entry Pass</Dialog.Title>
			<Dialog.Description class="text-xs text-left font-semibold text-muted-foreground">Provide a reason for declining verification on this entry pass.</Dialog.Description>
		</Dialog.Header>

		<Field.FieldGroup class="flex flex-col gap-4 py-2">
			<Field.Field>
				<Field.FieldLabel for="reasonText" class="text-xs font-bold uppercase text-muted-foreground tracking-wider">Reason for Rejection *</Field.FieldLabel>
				<textarea
					id="reasonText"
					bind:value={rejectionReason}
					placeholder="e.g. Blurry photo snapshot, invalid purpose statement, or unrecognized destination head"
					class="w-full h-24 rounded-xl border border-border bg-background p-3 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-destructive/20 focus-visible:border-destructive transition-all font-semibold"
					required
				></textarea>
			</Field.Field>
		</Field.FieldGroup>

		<Dialog.Footer class="flex gap-2 pt-3 border-t border-border/60">
			<Button onclick={() => (isRejecting = false)} variant="outline" class="flex-1 text-xs font-semibold rounded-xl h-10 cursor-pointer">
				Cancel
			</Button>
			<Button onclick={handleConfirmReject} variant="destructive" class="flex-1 text-xs font-extrabold rounded-xl h-10 cursor-pointer">
				Decline Pass
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<style>
	:global(.visitor-marker-container) {
		transition: transform 1.5s linear !important;
	}
</style>
