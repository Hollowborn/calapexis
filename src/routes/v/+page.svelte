<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { enhance } from '$app/forms';
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Drawer from "$lib/components/ui/drawer/index.js";
	import * as Field from "$lib/components/ui/field/index.js";
	import * as InputGroup from "$lib/components/ui/input-group/index.js";
	import * as Popover from "$lib/components/ui/popover/index.js";
	import * as Command from "$lib/components/ui/command/index.js";
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { toast } from 'svelte-sonner';
	import { MOCK_BUILDINGS, MOCK_OFFICES, checkoutLocalVisitor } from '$lib/supabase';
	import type { Visitor, Office } from '$lib/types';
	import { AnimatedThemeToggler } from "$lib/components/magic/animated-theme-toggler";

	// Lucide Icons
	import SearchIcon from "@lucide/svelte/icons/search";
	import MapPinIcon from "@lucide/svelte/icons/map-pin";
	import NavigationIcon from "@lucide/svelte/icons/navigation";
	import CameraIcon from "@lucide/svelte/icons/camera";
	import QrCodeIcon from "@lucide/svelte/icons/qr-code";
	import UserCheckIcon from "@lucide/svelte/icons/user-check";
	import CheckCircleIcon from "@lucide/svelte/icons/check-circle";
	import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
	import LogOutIcon from "@lucide/svelte/icons/log-out";
	import SmartphoneIcon from "@lucide/svelte/icons/smartphone";
	import Building2Icon from "@lucide/svelte/icons/building-2";
	import RefreshCwIcon from "@lucide/svelte/icons/refresh-cw";
	import SparklesIcon from "@lucide/svelte/icons/sparkles";
	import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
	import ChevronUpIcon from "@lucide/svelte/icons/chevron-up";
	import RadioIcon from "@lucide/svelte/icons/radio";
	import UploadIcon from "@lucide/svelte/icons/upload";
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
	import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";
	import CheckIcon from "@lucide/svelte/icons/check";

	let { data } = $props();

	let officesList = $derived(data?.offices?.length ? data.offices : MOCK_OFFICES);

	// Leaflet Map & GPS references
	let mapContainer: HTMLDivElement;
	let leafMap: any = $state(null);
	let leafletInstance: any = $state(null);
	let visitorMarker: any = null;
	let pathPolyline: any = null;

	// Floating Search & Filter state
	let searchQuery = $state('');
	let isSearchOpen = $state(false);

	// Controlled Modal & Drawer States
	let isDrawerOpen = $state(true);
	let isRegisterModalOpen = $state(false);
	let isScannerModalOpen = $state(false);
	let isReturningVisitor = $state(false);
	let isSubmittingRegister = $state(false);
	let isSubmittingCheckIn = $state(false);
	let isOfficeComboOpen = $state(false);

	// 3-Step Wizard Navigation State
	let registrationStep = $state<1 | 2 | 3>(1);

	// Registration Form Fields
	let firstName = $state('');
	let middleName = $state('');
	let lastName = $state('');
	let email = $state('');
	let phone = $state('');
	let purpose = $state('');
	let selectedOfficeId = $state('');
	let hostPerson = $state('');
	let photoUrl = $state('');
	let isCameraActive = $state(false);
	let videoElement = $state<HTMLVideoElement | null>(null);
	let canvasElement = $state<HTMLCanvasElement | null>(null);

	// Pre-Pass & Official Checked-In Pass state
	let prePassData = $state<{
		registeredVisitorId?: string;
		fullName: string;
		firstName: string;
		middleName?: string;
		lastName: string;
		email: string;
		phone: string;
		purpose: string;
		officeId: string;
		officeName: string;
		buildingId: string;
		buildingName: string;
		photoUrl: string;
	} | null>(null);

	let activeOfficialPass = $state<Visitor | null>(null);

	// GPS Location State
	let userGps = $state<{ lat: number; lng: number } | null>(null);
	let gpsStatus = $state<'disabled' | 'locating' | 'active'>('disabled');

	// Manual QR Scanner Fallback Code Input
	let manualScanCode = $state('');

	// Campus Bounds from static/prev-proj/map.js
	const campusBoundsCoords = [
		[9.893421456778755, 123.8815211010603],
		[9.895647770829878, 123.88369296680753]
	];
	const mainGateCoords = { lat: 9.894300, lng: 123.882100 };

	let selectedOffice = $derived(officesList.find(o => o.id === selectedOfficeId));
	let filteredLandmarks = $derived(
		officesList.filter(o => {
			if (!searchQuery.trim()) return true;
			const q = searchQuery.toLowerCase().trim();
			return o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q);
		})
	);

	onMount(async () => {
		if (typeof window === 'undefined') return;

		// 1. Check for saved visitor profile in localStorage (Cookie Auto-Fill)
		const savedProfile = localStorage.getItem('calapexis_visitor_profile');
		if (savedProfile) {
			try {
				const p = JSON.parse(savedProfile);
				firstName = p.firstName || '';
				middleName = p.middleName || '';
				lastName = p.lastName || '';
				email = p.email || '';
				phone = p.phone || '';
				photoUrl = p.photoUrl || '';
				isReturningVisitor = true;
			} catch (e) {
				console.warn("Failed to parse saved visitor profile:", e);
			}
		}

		// 2. Check for cached active pass in localStorage
		const cachedPass = localStorage.getItem('calapexis_active_pass');
		if (cachedPass) {
			try {
				activeOfficialPass = JSON.parse(cachedPass);
			} catch (e) {
				console.warn("Failed to parse cached active pass:", e);
			}
		}

		// 3. Initialize Leaflet Map
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

		const osmLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: '&copy; OpenStreetMap',
			maxNativeZoom: 19,
			maxZoom: 22
		}).addTo(map);

		const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
			attribution: "Esri",
			maxNativeZoom: 18,
			maxZoom: 22
		});

		const campusOverlay = L.imageOverlay("/campusMap-adjusted.png", bounds, {
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

		// Initial plot of visitor marker at Main Gate
		updateVisitorMarkerOnMap(mainGateCoords.lat, mainGateCoords.lng, "Visitor (Main Gate)");

		// 4. Request Device GPS Position
		requestDeviceGps();

		setTimeout(() => map.invalidateSize(), 250);
	});

	onDestroy(() => {
		stopSelfieCamera();
	});

	function requestDeviceGps() {
		if (typeof window === 'undefined' || !navigator.geolocation) return;
		gpsStatus = 'locating';
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				const lat = pos.coords.latitude;
				const lng = pos.coords.longitude;
				if (lat >= 9.8934 && lat <= 9.8956 && lng >= 123.8815 && lng <= 123.8836) {
					userGps = { lat, lng };
					gpsStatus = 'active';
					updateVisitorMarkerOnMap(lat, lng, "Live GPS Position");
					toast.success("GPS Location active on campus.");
				} else {
					gpsStatus = 'disabled';
					toast.info("GPS outside campus boundaries. Defaulting to Main Gate.");
				}
			},
			(err) => {
				console.warn("Geolocation access denied or unavailable:", err.message);
				gpsStatus = 'disabled';
			},
			{ enableHighAccuracy: true, timeout: 5000 }
		);
	}

	function updateVisitorMarkerOnMap(lat: number, lng: number, label: string) {
		if (!leafMap || !leafletInstance) return;
		const L = leafletInstance;

		const iconHtml = `
			<div class="group relative flex items-center justify-center">
				<span class="animate-ping absolute inline-flex size-8 rounded-full bg-primary/40"></span>
				<div class="relative flex size-8 items-center justify-center rounded-full bg-primary border-2 border-primary-foreground shadow-xl">
					<span class="text-[10px] font-black text-primary-foreground leading-none">YOU</span>
				</div>
			</div>
		`;

		if (visitorMarker) {
			visitorMarker.setLatLng([lat, lng]);
		} else {
			visitorMarker = L.marker([lat, lng], {
				icon: L.divIcon({
					className: "bg-transparent border-none",
					html: iconHtml,
					iconSize: [32, 32],
					iconAnchor: [16, 16]
				})
			}).bindPopup(`<div class="font-sans font-bold text-xs p-1">${label}</div>`).addTo(leafMap);
		}
	}

	function drawNavigationPathToOffice(office: Office) {
		if (!leafMap || !leafletInstance) return;
		const L = leafletInstance;

		const startLat = userGps?.lat || mainGateCoords.lat;
		const startLng = userGps?.lng || mainGateCoords.lng;

		const destLat = 9.894414;
		const destLng = 123.882580;

		if (pathPolyline) {
			leafMap.removeLayer(pathPolyline);
		}

		pathPolyline = L.polyline(
			[[startLat, startLng], [destLat, destLng]],
			{ color: '#3b82f6', weight: 4, opacity: 0.8, dashArray: '8, 8' }
		).addTo(leafMap);

		leafMap.fitBounds([[startLat, startLng], [destLat, destLng]], { padding: [40, 40] });
	}

	// Helper to safely write to localStorage without throwing QuotaExceededError
	function safeSetLocalStorage(key: string, value: any) {
		try {
			const serialized = typeof value === 'string' ? value : JSON.stringify(value);
			localStorage.setItem(key, serialized);
		} catch (e) {
			console.warn(`LocalStorage quota exceeded for ${key}, attempting fallback:`, e);
			if (typeof value === 'object' && value !== null) {
				const { photoUrl, ...rest } = value;
				try {
					localStorage.setItem(key, JSON.stringify(rest));
				} catch (err) {
					console.error("LocalStorage save failed:", err);
				}
			}
		}
	}

	// Selfie Camera Handlers
	async function startSelfieCamera() {
		try {
			isCameraActive = true;
			const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
			if (videoElement) {
				videoElement.srcObject = stream;
			}
		} catch (err) {
			console.error("Camera access failed:", err);
			toast.error("Unable to access selfie camera.");
			isCameraActive = false;
		}
	}

	function stopSelfieCamera() {
		if (videoElement && videoElement.srcObject) {
			const stream = videoElement.srcObject as MediaStream;
			stream.getTracks().forEach(track => track.stop());
			videoElement.srcObject = null;
		}
		isCameraActive = false;
	}

	function captureSelfieSnapshot() {
		if (!videoElement || !canvasElement) return;
		const context = canvasElement.getContext('2d');
		if (context) {
			canvasElement.width = 250;
			canvasElement.height = 250;
			context.drawImage(videoElement, 0, 0, 250, 250);
			photoUrl = canvasElement.toDataURL('image/jpeg', 0.6);
			stopSelfieCamera();
			toast.success("Selfie snapshot captured!");
		}
	}

	function handleFileUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			const file = target.files[0];
			const reader = new FileReader();
			reader.onload = (event) => {
				const img = new Image();
				img.onload = () => {
					const tempCanvas = document.createElement('canvas');
					tempCanvas.width = 250;
					tempCanvas.height = 250;
					const ctx = tempCanvas.getContext('2d');
					if (ctx) {
						ctx.drawImage(img, 0, 0, 250, 250);
						photoUrl = tempCanvas.toDataURL('image/jpeg', 0.6);
						toast.success("Image file uploaded & optimized!");
					}
				};
				img.src = event.target?.result as string;
			};
			reader.readAsDataURL(file);
		}
	}

	function clearSavedProfile() {
		try {
			localStorage.removeItem('calapexis_visitor_profile');
		} catch (e) {}
		firstName = ''; middleName = ''; lastName = ''; email = ''; phone = ''; photoUrl = '';
		isReturningVisitor = false;
		toast.info("Saved profile cleared.");
	}

	// Stepped Wizard Navigation Handlers
	function goToNextStep() {
		if (registrationStep === 1) {
			if (!firstName.trim() || !lastName.trim()) {
				toast.error("First Name and Last Name are required.");
				return;
			}
			registrationStep = 2;
		} else if (registrationStep === 2) {
			if (!photoUrl || !photoUrl.trim()) {
				toast.error("Please capture a selfie snapshot or upload an image file before proceeding.");
				return;
			}
			registrationStep = 3;
		}
	}

	function goToPrevStep() {
		if (registrationStep === 2) {
			stopSelfieCamera();
			registrationStep = 1;
		} else if (registrationStep === 3) {
			registrationStep = 2;
		}
	}

	// Form Action Enhance Handlers for Server Action Response Processing
	function handleRegisterEnhance() {
		isSubmittingRegister = true;
		return async ({ result }: { result: any }) => {
			isSubmittingRegister = false;
			if (result.type === 'success' && result.data?.prePassData) {
				const data = result.data.prePassData;
				prePassData = data;
				safeSetLocalStorage('calapexis_visitor_profile', {
					firstName: data.firstName,
					middleName: data.middleName,
					lastName: data.lastName,
					email: data.email,
					phone: data.phone,
					photoUrl: data.photoUrl
				});

				isRegisterModalOpen = false;
				registrationStep = 1;

				const targetOffice = officesList.find(o => o.id === data.officeId);
				if (targetOffice) {
					drawNavigationPathToOffice(targetOffice);
				}

				toast.success("Registration saved to database!", {
					description: `Pre-Pass issued for ${data.officeName}. Scan QR code at the desk.`
				});
			} else if (result.type === 'failure') {
				toast.error(result.data?.message || "Registration failed.");
			}
		};
	}

	function handleCheckInEnhance() {
		isSubmittingCheckIn = true;
		return async ({ result }: { result: any }) => {
			isSubmittingCheckIn = false;
			if (result.type === 'success' && result.data?.activeOfficialPass) {
				const pass = result.data.activeOfficialPass;
				activeOfficialPass = pass;
				safeSetLocalStorage('calapexis_active_pass', pass);
				isScannerModalOpen = false;

				updateVisitorMarkerOnMap(9.894414, 123.882580, `${pass.fullName} (${pass.officeName || 'Office Check-In'})`);

				toast.success("Check-In Complete!", {
					description: `Digital Pass ${pass.passCode} logged in database.`
				});
			} else if (result.type === 'failure') {
				toast.error(result.data?.message || "Check-In failed.");
			}
		};
	}

	function handleSelfCheckout() {
		if (activeOfficialPass) {
			checkoutLocalVisitor(activeOfficialPass.id);
			localStorage.removeItem('calapexis_active_pass');
			activeOfficialPass = null;
			prePassData = null;
			if (pathPolyline && leafMap) {
				leafMap.removeLayer(pathPolyline);
			}
			toast.info("Checked out of campus. Thank you for visiting!");
		}
	}

	function focusOfficeOnMap(office: Office) {
		if (leafMap) {
			leafMap.setView([9.894414, 123.882580], 20, { animate: true });
			toast.info(`Camera focused on ${office.name}.`);
		}
	}
</script>

<div class="relative w-full h-screen overflow-hidden bg-background text-foreground font-sans select-none">
	<!-- TOP FLOATING APPLE MAPS SEARCH BAR (`InputGroup`) -->
	<div class="absolute top-4 left-4 right-4 z-30 max-w-lg mx-auto">
		<InputGroup.Root class="shadow-2xl rounded-2xl bg-card/90 backdrop-blur-xl border border-border transition-all">
			<InputGroup.Input 
				placeholder="Search building, office, or room..." 
				bind:value={searchQuery}
				onfocus={() => isSearchOpen = true}
				class="h-12 text-xs font-semibold pl-4 bg-transparent text-foreground placeholder:text-muted-foreground"
			/>
			<InputGroup.Addon align="inline-end" class="pr-2">
				<SearchIcon data-icon="inline-start" class="size-4 text-primary" />
			</InputGroup.Addon>
		</InputGroup.Root>

		<!-- Search Suggestions Dropdown -->
		{#if isSearchOpen && searchQuery.trim()}
			<Card.Root class="mt-2 shadow-2xl border-border rounded-2xl bg-card/95 backdrop-blur-xl max-h-60 overflow-y-auto">
				<Card.Content class="p-2 flex flex-col gap-1">
					{#each filteredLandmarks as landmark}
						<button 
							onclick={() => { focusOfficeOnMap(landmark); searchQuery = landmark.name; isSearchOpen = false; }}
							class="w-full text-start p-2.5 rounded-xl hover:bg-muted/40 transition-colors flex items-center justify-between text-xs font-semibold cursor-pointer"
						>
							<div>
								<div class="font-extrabold text-foreground">{landmark.name}</div>
								<div class="text-[10px] text-muted-foreground">{landmark.code} • {landmark.headPerson || 'Office Desk'}</div>
							</div>
							<Badge variant="outline" class="text-[9px] font-mono">Focus</Badge>
						</button>
					{/each}
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	<!-- TOP RIGHT FLOATING CONTROLS -->
	<div class="absolute top-4 right-4 z-30 flex flex-col gap-2 pt-16">
		<Button 
			onclick={requestDeviceGps} 
			variant="outline" 
			size="icon" 
			class="size-10 rounded-2xl bg-card/90 backdrop-blur-xl border-border shadow-xl cursor-pointer"
		>
			<NavigationIcon data-icon="inline-start" class="size-4 text-primary {gpsStatus === 'locating' ? 'animate-spin' : ''}" />
		</Button>
		<AnimatedThemeToggler />
	</div>

	<!-- MAIN LEAFLET MAP CANVAS -->
	<div bind:this={mapContainer} class="size-full z-10"></div>

	<!-- BOTTOM SHEET DRAWER (Apple Maps Style `Drawer.Root`) -->
	<Drawer.Root bind:open={isDrawerOpen} dismissible={false}>
		<Drawer.Portal>
			<Drawer.Content class="z-[100] max-w-md mx-auto border-border bg-card/95 backdrop-blur-2xl rounded-t-3xl shadow-2xl">
				<Drawer.Header class="pb-2 pt-3 text-center">
					<div class="w-12 h-1.5 rounded-full bg-muted-foreground/30 mx-auto mb-2"></div>
					
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<div class="size-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-black">C</div>
							<div class="text-start">
								<Drawer.Title class="text-sm font-black text-foreground">Calapexis Mobile Visitor Portal</Drawer.Title>
								<Drawer.Description class="text-[10px] text-muted-foreground">Campus Navigation & QR Office Check-In</Drawer.Description>
							</div>
						</div>

						<Badge variant="outline" class="text-[10px] font-bold border-primary/20 text-primary gap-1">
							<span class="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
							{gpsStatus === 'active' ? 'GPS Active' : 'Main Gate'}
						</Badge>
					</div>
				</Drawer.Header>

				<div class="p-5 pt-1 flex flex-col gap-4 font-semibold text-xs text-card-foreground">
					{#if activeOfficialPass}
						<!-- STATE C: Official Checked-In Visitor Pass -->
						<div class="flex flex-col gap-3 py-1">
							<div class="flex items-center justify-between">
								<Badge variant="outline" class="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] uppercase border-emerald-500/30 gap-1">
									<CheckCircleIcon class="size-3" />
									OFFICIAL DIGITAL VISITOR PASS
								</Badge>
								<span class="font-mono text-xs font-black text-primary">{activeOfficialPass.passCode}</span>
							</div>

							<div>
								<h4 class="text-base font-black text-foreground">{activeOfficialPass.fullName}</h4>
								<div class="grid grid-cols-2 gap-2 text-[11px] mt-2 pt-2 border-t border-border/60">
									<div>
										<span class="text-muted-foreground block text-[9px] uppercase font-bold tracking-wider">Office Destination</span>
										<div class="font-extrabold text-foreground">{activeOfficialPass.officeName || 'Campus Office'}</div>
									</div>
									<div>
										<span class="text-muted-foreground block text-[9px] uppercase font-bold tracking-wider">Check-In Time</span>
										<div class="font-mono font-bold text-foreground">{new Date(activeOfficialPass.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
									</div>
								</div>
							</div>

							<Button onclick={handleSelfCheckout} variant="destructive" class="w-full font-extrabold text-xs rounded-xl h-10 gap-1.5 cursor-pointer shadow-xs mt-1">
								<LogOutIcon data-icon="inline-start" />
								<span>Check Out of Campus</span>
							</Button>
						</div>

					{:else if prePassData}
						<!-- STATE B: Pre-Pass Active -> Pending Office QR Scan -->
						<div class="flex flex-col gap-3 py-1">
							<div class="flex items-center justify-between">
								<Badge variant="outline" class="bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold text-[10px] border-amber-500/30 gap-1">
									<RadioIcon class="size-3 animate-pulse" />
									PRE-CHECK-IN ACTIVE
								</Badge>
								<span class="text-[10px] text-muted-foreground font-bold">{prePassData.fullName}</span>
							</div>

							<div>
								<h4 class="text-sm font-black text-foreground">Destination: {prePassData.officeName}</h4>
								<p class="text-xs text-muted-foreground leading-relaxed mt-0.5">
									Follow the blue navigation path on the map, then scan the office QR code at the desk to complete check-in.
								</p>
							</div>

							<div class="flex gap-2 pt-1">
								<Button onclick={() => isScannerModalOpen = true} class="flex-1 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-10 gap-1.5 cursor-pointer shadow-xs">
									<QrCodeIcon data-icon="inline-start" />
									<span>Scan Office QR</span>
								</Button>
								<Button onclick={() => isScannerModalOpen = true} variant="outline" class="flex-1 font-bold text-xs rounded-xl h-10 gap-1.5 cursor-pointer">
									<SmartphoneIcon data-icon="inline-start" />
									<span>Manual Code</span>
								</Button>
							</div>
						</div>

					{:else}
						<!-- STATE A: Visitor Unregistered -> Start Registration -->
						<div class="flex flex-col gap-3 py-2 text-start">
							<div class="flex items-center gap-2 text-primary font-black text-sm">
								<SparklesIcon class="size-4" />
								<span>Welcome Visitor!</span>
							</div>
							<p class="text-xs text-muted-foreground leading-relaxed">
								Fill out your details step-by-step, take a selfie or upload a photo, and select your destination office to generate your pass.
							</p>
							<Button onclick={() => { registrationStep = 1; isRegisterModalOpen = true; }} class="w-full bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-11 gap-2 cursor-pointer shadow-md mt-1">
								<UserCheckIcon data-icon="inline-start" />
								<span>Register & Request Visitor Pass</span>
							</Button>
						</div>
					{/if}
				</div>
			</Drawer.Content>
		</Drawer.Portal>
	</Drawer.Root>
</div>

<!-- STEPPED VISITOR REGISTRATION WIZARD (`Dialog.Root`) -->
<Dialog.Root bind:open={isRegisterModalOpen}>
	<Dialog.Portal>
		<Dialog.Content class="z-[100] max-w-md border-border bg-card text-card-foreground shadow-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
			<!-- WIZARD STEP PROGRESS BAR -->
			<div class="flex items-center justify-between gap-2 pt-2 px-1">
				<div class="flex-1 h-1.5 rounded-full {registrationStep >= 1 ? 'bg-primary' : 'bg-muted'} transition-colors"></div>
				<div class="flex-1 h-1.5 rounded-full {registrationStep >= 2 ? 'bg-primary' : 'bg-muted'} transition-colors"></div>
				<div class="flex-1 h-1.5 rounded-full {registrationStep >= 3 ? 'bg-primary' : 'bg-muted'} transition-colors"></div>
			</div>

			<Dialog.Header class="pt-1">
				<Dialog.Title class="text-base font-black text-foreground flex items-center gap-2">
					<UserCheckIcon class="size-5 text-primary" />
					{#if registrationStep === 1}
						<span>Step 1: Personal Details</span>
					{:else if registrationStep === 2}
						<span>Step 2: Face Photo / Image Upload</span>
					{:else}
						<span>Step 3: Office & Purpose</span>
					{/if}
				</Dialog.Title>
				<Dialog.Description class="text-xs text-muted-foreground">
					{#if registrationStep === 1}
						Enter your full name and optional contact info.
					{:else if registrationStep === 2}
						Take a selfie camera snapshot or upload an image file (Required).
					{:else}
						Select your destination office and state your visit purpose.
					{/if}
				</Dialog.Description>
			</Dialog.Header>

			<!-- SvelteKit Server Action Form -->
			<form action="?/register" method="POST" use:enhance={handleRegisterEnhance} class="flex flex-col gap-4 py-2 font-semibold text-xs">
				<input type="hidden" name="firstName" value={firstName} />
				<input type="hidden" name="middleName" value={middleName} />
				<input type="hidden" name="lastName" value={lastName} />
				<input type="hidden" name="email" value={email} />
				<input type="hidden" name="phone" value={phone} />
				<input type="hidden" name="photoUrl" value={photoUrl} />
				<input type="hidden" name="officeId" value={selectedOfficeId} />
				<input type="hidden" name="purpose" value={purpose} />

				{#if registrationStep === 1}
					<!-- STEP 1: PERSONAL INFORMATION -->
					{#if isReturningVisitor}
						<div class="p-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs font-semibold">
							<div class="flex items-center gap-2">
								<SparklesIcon class="size-4 text-primary" />
								<span class="font-bold text-foreground">Welcome Back! Saved Profile Auto-Filled</span>
							</div>
							<button type="button" onclick={clearSavedProfile} class="text-[10px] text-primary font-black uppercase hover:underline cursor-pointer">Clear</button>
						</div>
					{/if}

					<Field.FieldGroup class="flex flex-col gap-3">
						<div class="grid grid-cols-3 gap-2">
							<Field.Field>
								<Field.FieldLabel for="reg-firstName">First Name *</Field.FieldLabel>
								<Input id="reg-firstName" name="firstName" bind:value={firstName} placeholder="John" required class="rounded-xl h-9 text-xs" />
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="reg-middleName">Middle</Field.FieldLabel>
								<Input id="reg-middleName" name="middleName" bind:value={middleName} placeholder="Paul" class="rounded-xl h-9 text-xs" />
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="reg-lastName">Last Name *</Field.FieldLabel>
								<Input id="reg-lastName" name="lastName" bind:value={lastName} placeholder="Doe" required class="rounded-xl h-9 text-xs" />
							</Field.Field>
						</div>

						<div class="grid grid-cols-2 gap-2">
							<Field.Field>
								<Field.FieldLabel for="reg-email">Email (Optional)</Field.FieldLabel>
								<Input id="reg-email" name="email" type="email" bind:value={email} placeholder="john@example.com" class="rounded-xl h-9 text-xs" />
							</Field.Field>
							<Field.Field>
								<Field.FieldLabel for="reg-phone">Phone (Optional)</Field.FieldLabel>
								<Input id="reg-phone" name="phone" type="tel" bind:value={phone} placeholder="+63 917..." class="rounded-xl h-9 text-xs" />
							</Field.Field>
						</div>
					</Field.FieldGroup>

					<Dialog.Footer class="pt-3 border-t border-border/60 flex gap-2">
						<Button type="button" onclick={() => isRegisterModalOpen = false} variant="outline" class="flex-1 text-xs font-semibold rounded-xl h-10 cursor-pointer">
							Cancel
						</Button>
						<Button type="button" onclick={goToNextStep} class="flex-1 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-10 gap-1.5 cursor-pointer">
							<span>Next: Photo Step</span>
							<ArrowRightIcon data-icon="inline-end" />
						</Button>
					</Dialog.Footer>

				{:else if registrationStep === 2}
					<!-- STEP 2: FACE PHOTO SNAPSHOT OR FILE UPLOAD (MANDATORY) -->
					<div class="flex flex-col gap-3">
						<div class="flex flex-col gap-2 items-center p-4 rounded-2xl border border-border bg-muted/40 text-center">
							{#if photoUrl}
								<img src={photoUrl} alt="Selfie Preview" class="size-28 rounded-full object-cover border-4 border-primary/30 shadow-lg" />
								<span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Photo Captured & Ready!</span>
								<div class="flex gap-2 pt-1">
									<Button type="button" onclick={startSelfieCamera} variant="outline" size="sm" class="text-xs font-bold rounded-xl h-8 gap-1">
										<RefreshCwIcon data-icon="inline-start" />
										<span>Retake Camera</span>
									</Button>
								</div>
							{:else if isCameraActive}
								<div class="relative size-44 rounded-2xl overflow-hidden bg-black border border-primary/40">
									<video bind:this={videoElement} autoplay playsinline class="size-full object-cover"></video>
								</div>
								<canvas bind:this={canvasElement} class="hidden"></canvas>
								<Button type="button" onclick={captureSelfieSnapshot} class="bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-9 gap-1.5 cursor-pointer mt-2">
									<CameraIcon data-icon="inline-start" />
									<span>Capture Snapshot</span>
								</Button>
							{:else}
								<div class="size-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
									<CameraIcon class="size-8" />
								</div>
								<div class="flex flex-col sm:flex-row gap-2 pt-2 w-full">
									<Button type="button" onclick={startSelfieCamera} variant="outline" class="flex-1 text-xs font-bold rounded-xl h-9 gap-1.5 cursor-pointer">
										<CameraIcon data-icon="inline-start" />
										<span>Selfie Camera</span>
									</Button>

									<label class="flex-1 flex items-center justify-center gap-1.5 px-3 h-9 rounded-xl border border-border bg-card hover:bg-muted/40 font-bold text-xs cursor-pointer">
										<UploadIcon class="size-4 text-primary pointer-events-none" />
										<span>Upload File</span>
										<input type="file" accept="image/*" onchange={handleFileUpload} class="hidden" />
									</label>
								</div>
							{/if}
						</div>
					</div>

					<Dialog.Footer class="pt-3 border-t border-border/60 flex gap-2">
						<Button type="button" onclick={goToPrevStep} variant="outline" class="flex-1 text-xs font-semibold rounded-xl h-10 gap-1.5 cursor-pointer">
							<ArrowLeftIcon data-icon="inline-start" />
							<span>Back</span>
						</Button>
						<Button type="button" onclick={goToNextStep} class="flex-1 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-10 gap-1.5 cursor-pointer">
							<span>Next: Office Step</span>
							<ArrowRightIcon data-icon="inline-end" />
						</Button>
					</Dialog.Footer>

				{:else if registrationStep === 3}
					<!-- STEP 3: DESTINATION OFFICE (COMBOBOX) & PURPOSE -->
					<Field.FieldGroup class="flex flex-col gap-3">
						<Field.Field>
							<Field.FieldLabel>Designated Office / Desk *</Field.FieldLabel>
							<Popover.Root bind:open={isOfficeComboOpen}>
								<Popover.Trigger>
									<Button variant="outline" type="button" role="combobox" class="w-full justify-between rounded-xl h-10 text-xs font-bold border-border bg-background cursor-pointer">
										<span class="truncate">
											{selectedOffice ? `${selectedOffice.name} (${selectedOffice.code})` : "-- Select Destination Office --"}
										</span>
										<ChevronsUpDownIcon class="size-4 opacity-50 ml-2 shrink-0 pointer-events-none" />
									</Button>
								</Popover.Trigger>
								<Popover.Content class="w-full p-0 max-h-60 overflow-y-auto z-[120] border-border bg-popover text-popover-foreground rounded-2xl shadow-xl">
									<Command.Root>
										<Command.Input placeholder="Search office or department..." class="h-9 text-xs" />
										<Command.List class="p-1">
											<Command.Empty class="p-2 text-xs text-muted-foreground text-center">No office found.</Command.Empty>
											<Command.Group>
												{#each officesList as office}
													<Command.Item
														value={office.name}
														onSelect={() => {
															selectedOfficeId = office.id;
															isOfficeComboOpen = false;
														}}
														class="text-xs font-semibold cursor-pointer rounded-xl p-2 flex items-center justify-between hover:bg-muted/50"
													>
														<span>{office.name} ({office.code})</span>
														{#if selectedOfficeId === office.id}
															<CheckIcon class="size-3.5 text-primary" />
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
							<Field.FieldLabel for="reg-purpose">Purpose of Visit *</Field.FieldLabel>
							<Input id="reg-purpose" name="purpose" bind:value={purpose} placeholder="e.g. Transcript of Records Request" required class="rounded-xl h-9 text-xs" />
						</Field.Field>
					</Field.FieldGroup>

					<Dialog.Footer class="pt-3 border-t border-border/60 flex gap-2">
						<Button type="button" onclick={goToPrevStep} variant="outline" class="flex-1 text-xs font-semibold rounded-xl h-10 gap-1.5 cursor-pointer">
							<ArrowLeftIcon data-icon="inline-start" />
							<span>Back</span>
						</Button>
						<Button type="submit" disabled={isSubmittingRegister} class="flex-1 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-10 cursor-pointer shadow-md">
							<span>{isSubmittingRegister ? 'Saving...' : 'Complete & Issue Pass'}</span>
						</Button>
					</Dialog.Footer>
				{/if}
			</form>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<!-- STEP 4 OFFICE QR CODE SCANNER MODAL (`Dialog.Root`) -->
<Dialog.Root bind:open={isScannerModalOpen}>
	<Dialog.Portal>
		<Dialog.Content class="z-[100] max-w-md border-border bg-card text-card-foreground shadow-2xl rounded-3xl">
			<Dialog.Header>
				<Dialog.Title class="text-base font-black text-foreground flex items-center gap-2">
					<QrCodeIcon class="size-5 text-primary" />
					<span>Scan Office QR Code</span>
				</Dialog.Title>
				<Dialog.Description class="text-xs text-muted-foreground">
					Scan the QR code displayed on the office door/desk to complete your check-in.
				</Dialog.Description>
			</Dialog.Header>

			<div class="flex flex-col gap-4 py-3 items-center text-center font-semibold text-xs">
				<div class="relative size-48 rounded-2xl bg-muted/60 border-2 border-dashed border-primary/50 flex flex-col items-center justify-center p-4">
					<QrCodeIcon class="size-16 text-primary/40 animate-pulse" />
					<span class="text-[10px] text-muted-foreground font-mono mt-2 uppercase tracking-wider">Point Camera at QR Code</span>
				</div>

				<!-- SvelteKit Server Action Form for Quick QR Scan -->
				<form action="?/checkIn" method="POST" use:enhance={handleCheckInEnhance} class="w-full flex flex-col gap-2 text-start pt-2">
					<input type="hidden" name="registeredVisitorId" value={prePassData?.registeredVisitorId || ''} />
					<input type="hidden" name="fullName" value={prePassData?.fullName || ''} />
					<input type="hidden" name="firstName" value={prePassData?.firstName || ''} />
					<input type="hidden" name="middleName" value={prePassData?.middleName || ''} />
					<input type="hidden" name="lastName" value={prePassData?.lastName || ''} />
					<input type="hidden" name="email" value={prePassData?.email || ''} />
					<input type="hidden" name="phone" value={prePassData?.phone || ''} />
					<input type="hidden" name="officeId" value={prePassData?.officeId || ''} />
					<input type="hidden" name="purpose" value={prePassData?.purpose || ''} />
					<input type="hidden" name="photoUrl" value={prePassData?.photoUrl || ''} />

					<span class="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Simulate Office Scan:</span>
					<div class="flex flex-wrap gap-1.5">
						{#each officesList as o}
							<button type="submit" name="officeCode" value={o.code} class="text-xs font-mono rounded-xl h-8 px-3 border border-border/80 bg-card hover:bg-muted/40 cursor-pointer">
								{o.code}
							</button>
						{/each}
					</div>
				</form>

				<Separator />

				<!-- Manual Code Fallback Input Server Action Form (`InputGroup`) -->
				<form action="?/checkIn" method="POST" use:enhance={handleCheckInEnhance} class="w-full flex flex-col gap-1.5 text-start">
					<input type="hidden" name="registeredVisitorId" value={prePassData?.registeredVisitorId || ''} />
					<input type="hidden" name="fullName" value={prePassData?.fullName || ''} />
					<input type="hidden" name="firstName" value={prePassData?.firstName || ''} />
					<input type="hidden" name="middleName" value={prePassData?.middleName || ''} />
					<input type="hidden" name="lastName" value={prePassData?.lastName || ''} />
					<input type="hidden" name="email" value={prePassData?.email || ''} />
					<input type="hidden" name="phone" value={prePassData?.phone || ''} />
					<input type="hidden" name="officeId" value={prePassData?.officeId || ''} />
					<input type="hidden" name="purpose" value={prePassData?.purpose || ''} />
					<input type="hidden" name="photoUrl" value={prePassData?.photoUrl || ''} />

					<span class="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider">Camera Blurry or Broken? Enter Code:</span>
					<InputGroup.Root class="rounded-xl border border-border">
						<InputGroup.Input name="officeCode" placeholder="e.g. OFF-REGISTRAR" bind:value={manualScanCode} class="h-9 text-xs font-mono uppercase tracking-wider" />
						<InputGroup.Addon align="inline-end" class="pr-1">
							<Button type="submit" disabled={isSubmittingCheckIn} size="sm" class="h-7 text-xs font-bold rounded-lg px-3">
								{isSubmittingCheckIn ? 'Checking in...' : 'Submit'}
							</Button>
						</InputGroup.Addon>
					</InputGroup.Root>
				</form>
			</div>

			<Dialog.Footer class="pt-2 border-t border-border/60">
				<Button onclick={() => isScannerModalOpen = false} variant="outline" class="w-full text-xs font-semibold rounded-xl h-10 cursor-pointer">
					Close Scanner
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	:global(.leaflet-marker-icon) {
		transition: transform 1.5s linear !important;
	}
</style>
