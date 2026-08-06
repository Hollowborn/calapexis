<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { Html5Qrcode } from 'html5-qrcode';
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Field from "$lib/components/ui/field/index.js";
	import * as InputGroup from "$lib/components/ui/input-group/index.js";
	import * as Popover from "$lib/components/ui/popover/index.js";
	import * as Command from "$lib/components/ui/command/index.js";
	import { Switch } from "$lib/components/ui/switch/index.js";
	import { Skeleton } from "$lib/components/ui/skeleton/index.js";
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { toast } from 'svelte-sonner';
	import { MOCK_BUILDINGS, MOCK_OFFICES, MOCK_ROOMS, checkoutLocalVisitor, signInWithGoogle } from '$lib/supabase';
	import type { Visitor, Office, Building, Room } from '$lib/types';
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
	import SchoolIcon from "@lucide/svelte/icons/school";
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
	import LayersIcon from "@lucide/svelte/icons/layers";
	import DoorClosedIcon from "@lucide/svelte/icons/door-closed";
	import MailIcon from "@lucide/svelte/icons/mail";
	import UserIcon from "@lucide/svelte/icons/user";
	import Layers2Icon from "@lucide/svelte/icons/layers-2";

	let { data } = $props();

	let officesList = $derived(data?.offices?.length ? data.offices : MOCK_OFFICES);
	let buildingsList = $derived(data?.buildings?.length ? data.buildings : MOCK_BUILDINGS);
	let roomsList = $derived(data?.rooms?.length ? data.rooms : MOCK_ROOMS);

	// Leaflet Map & GPS references
	let mapContainer: HTMLDivElement;
	let leafMap: any = $state(null);
	let leafletInstance: any = $state(null);
	let visitorMarker: any = null;
	let pathPolyline: any = null;
	let buildingMarkers: any[] = [];
	let osmLayerInstance: any = null;
	let satelliteLayerInstance: any = null;
	let campusOverlayInstance: any = null;

	// Layer Control & Map state
	let activeTileLayer = $state<'osm' | 'esri'>('osm');
	let showCampusOverlay = $state(true);
	let isLayersPopoverOpen = $state(false);

	// Floating Search & Filter state
	let searchQuery = $state('');
	let isSearchOpen = $state(false);

	// Controlled Gate Setup Overlay, Building Modal, & Scanner Modal States
	let isGateOverlayOpen = $state(true);
	let isScannerModalOpen = $state(false);
	let isBuildingModalOpen = $state(false);
	let selectedBuildingForModal = $state<any | null>(null);
	let isBuildingImageLoading = $state(true);
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

	let isGooglePreFilled = $state(false);

	async function handleVisitorGoogleSignIn() {
		try {
			toast.promise(
				signInWithGoogle(data.supabase, `${window.location.origin}/auth/callback?next=/v`),
				{
					loading: "Connecting to Google Account...",
					success: "Redirecting to Google...",
					error: (err: any) => err?.message || "Failed to launch Google authentication."
				}
			);
		} catch (e: any) {
			toast.error(e?.message || "Google Authentication unavailable.");
		}
	}

	$effect(() => {
		if (data?.googleVisitorData && !isGooglePreFilled) {
			const g = data.googleVisitorData;
			if (g.firstName) firstName = g.firstName;
			if (g.middleName) middleName = g.middleName;
			if (g.lastName) lastName = g.lastName;
			if (g.email) email = g.email;
			if (g.phone) phone = g.phone;
			if (g.photoUrl) photoUrl = g.photoUrl;

			isGooglePreFilled = true;
			isGateOverlayOpen = true;

			toast.success("Visitor details auto-filled via Google!", {
				description: `Welcome ${g.fullName || g.email}! Please select your destination office.`
			});
		}
	});

	// Pre-Pass & Official Checked-In Pass state
	let prePassData = $state<{
		logId?: string;
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
	let qrScannerInstance: Html5Qrcode | null = $state(null);
	let isQrScanning = $state(false);
	let qrScanError = $state<string | null>(null);
	let checkInFormElement = $state<HTMLFormElement | null>(null);
	let hiddenOfficeCodeInput = $state<HTMLInputElement | null>(null);

	async function startQrScanner() {
		if (typeof window === 'undefined') return;
		qrScanError = null;
		isQrScanning = true;

		try {
			await new Promise((r) => setTimeout(r, 150));
			const container = document.getElementById('qr-reader');
			if (!container) return;

			if (qrScannerInstance) {
				try {
					await qrScannerInstance.stop();
				} catch (e) {}
			}

			qrScannerInstance = new Html5Qrcode('qr-reader');
			await qrScannerInstance.start(
				{ facingMode: 'environment' },
				{
					fps: 10,
					qrbox: { width: 200, height: 200 }
				},
				(decodedText) => {
					handleQrScannedCode(decodedText);
				},
				() => {}
			);
		} catch (err: any) {
			console.warn('QR Scanner camera error:', err);
			isQrScanning = false;
			qrScanError = 'Camera access unavailable or denied. Please enter the office code manually below.';
		}
	}

	async function stopQrScanner() {
		if (qrScannerInstance) {
			try {
				await qrScannerInstance.stop();
				qrScannerInstance.clear();
			} catch (e) {}
			qrScannerInstance = null;
		}
		isQrScanning = false;
	}

	function handleQrScannedCode(code: string) {
		stopQrScanner();
		isScannerModalOpen = false;
		toast.success('Office QR Code Scanned!', {
			description: `Scanned Code: ${code.toUpperCase()}`
		});

		if (hiddenOfficeCodeInput && checkInFormElement) {
			hiddenOfficeCodeInput.value = code.trim().toUpperCase();
			checkInFormElement.requestSubmit();
		}
	}

	$effect(() => {
		if (isScannerModalOpen) {
			startQrScanner();
		} else {
			stopQrScanner();
		}
	});

	// Campus Bounds from static/prev-proj/map.js
	const campusBoundsCoords = [
		[9.893421456778755, 123.8815211010603],
		[9.895647770829878, 123.88369296680753]
	];
	const mainGateCoords = { lat: 9.894144489361919, lng: 123.88273758838274 };

	let selectedOffice = $derived(officesList.find(o => o.id === selectedOfficeId));
	let selectedBuildingOffices = $derived(
		selectedBuildingForModal
			? officesList.filter(o => o.buildingId === selectedBuildingForModal.id)
			: []
	);

	let selectedBuildingRooms = $derived(
		selectedBuildingForModal
			? roomsList.filter(r => r.buildingId === selectedBuildingForModal.id)
			: []
	);

	// Categorized Search Results (Buildings, Offices, Rooms)
	let searchResults = $derived.by(() => {
		const q = searchQuery.toLowerCase().trim();
		if (!q) return { buildings: [], offices: [], rooms: [] };

		const matchingBuildings = buildingsList.filter(b => 
			b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)
		);

		const matchingOffices = officesList.filter(o => 
			o.name.toLowerCase().includes(q) || 
			o.code.toLowerCase().includes(q) || 
			(o.description && o.description.toLowerCase().includes(q))
		);

		const matchingRooms = roomsList.filter(r => 
			r.roomName.toLowerCase().includes(q) || 
			r.roomNumber.toLowerCase().includes(q) || 
			(r.description && r.description.toLowerCase().includes(q))
		);

		return {
			buildings: matchingBuildings,
			offices: matchingOffices,
			rooms: matchingRooms
		};
	});

	function focusSearchResult(item: any, type: 'building' | 'office' | 'room') {
		let targetBuilding: any = null;

		if (type === 'building') {
			targetBuilding = item;
		} else if (type === 'office') {
			targetBuilding = buildingsList.find(b => b.id === item.buildingId);
			if (!targetBuilding && item.buildingName) {
				targetBuilding = buildingsList.find(b => b.name === item.buildingName);
			}
			if (!targetBuilding && buildingsList.length > 0) {
				targetBuilding = buildingsList[0];
			}
		} else if (type === 'room') {
			targetBuilding = buildingsList.find(b => b.id === item.buildingId);
		}

		if (targetBuilding && targetBuilding.xCoord && targetBuilding.yCoord && leafMap) {
			leafMap.flyTo([targetBuilding.xCoord, targetBuilding.yCoord], 20, { duration: 1.2 });
			selectedBuildingForModal = targetBuilding;
			isBuildingModalOpen = true;
			isSearchOpen = false;
			searchQuery = '';

			if (type === 'office') {
				toast.info(`Navigating to ${item.name}`, {
					description: `Located inside ${targetBuilding.name}`
				});
			} else if (type === 'room') {
				toast.info(`Navigating to ${item.roomName} (${item.roomNumber})`, {
					description: `Located inside ${targetBuilding.name}`
				});
			} else {
				toast.info(`Navigating to ${targetBuilding.name}`);
			}
		} else if (targetBuilding) {
			selectedBuildingForModal = targetBuilding;
			isBuildingModalOpen = true;
			isSearchOpen = false;
			searchQuery = '';
		} else {
			toast.error("Location coordinates not configured for this item.");
		}
	}

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
				registrationStep = 3; // Fast-track returning visitor directly to Step 3
			} catch (e) {
				console.warn("Failed to parse saved visitor profile:", e);
			}
		}

		// 2. Check for cached active pass in localStorage
		const cachedPass = localStorage.getItem('calapexis_active_pass');
		if (cachedPass) {
			try {
				activeOfficialPass = JSON.parse(cachedPass);
				isGateOverlayOpen = false;
			} catch (e) {
				console.warn("Failed to parse cached active pass:", e);
			}
		}

		// 3. Check URL parameter to skip gate setup wizard and land directly on map
		const skipSetup = page.url.searchParams.get('skipSetup') === 'true' || page.url.searchParams.get('mode') === 'map' || page.url.searchParams.get('view') === 'map';
		if (skipSetup) {
			isGateOverlayOpen = false;
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
		}).setView([mainGateCoords.lat, mainGateCoords.lng], 19);

		osmLayerInstance = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
			attribution: '&copy; OpenStreetMap',
			maxNativeZoom: 19,
			maxZoom: 22
		}).addTo(map);

		satelliteLayerInstance = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
			attribution: "Esri",
			maxNativeZoom: 18,
			maxZoom: 22
		});

		campusOverlayInstance = L.imageOverlay("/campusMap-adjusted.png", bounds, {
			opacity: 1.0,
			interactive: false,
			zIndex: 300
		}).addTo(map);

		leafMap = map;

		// 4. Plot Interactive Building Nodes on Map
		plotBuildingNodesOnMap();

		// Initial plot of visitor marker at Main Gate or checked-in office location
		if (activeOfficialPass) {
			moveVisitorToOfficeLocation(activeOfficialPass);
		} else if (prePassData) {
			moveVisitorToOfficeLocation(prePassData);
		} else {
			updateVisitorMarkerOnMap(mainGateCoords.lat, mainGateCoords.lng, "Visitor (Main Gate)");
		}

		// 5. Request Device GPS Position
		requestDeviceGps();

		setTimeout(() => map.invalidateSize(), 250);
	});

	onDestroy(() => {
		stopSelfieCamera();
	});

	// Dynamic Tile Layer & Campus Overlay Effect
	$effect(() => {
		if (!leafMap || !leafletInstance) return;
		
		if (activeTileLayer === 'osm') {
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

	function getBuildingLatLng(b: any): [number, number] {
		// 1. Prioritize explicit latitude and longitude columns from database
		if (typeof b.lat === 'number' && typeof b.lng === 'number' && b.lat !== 0 && b.lng !== 0) {
			return [b.lat, b.lng];
		}
		// 2. Check if xCoord / yCoord contain lat/lng values
		if (typeof b.xCoord === 'number' && typeof b.yCoord === 'number' && b.xCoord > 0 && b.yCoord > 0) {
			const latVal = b.xCoord < 50 ? b.xCoord : b.yCoord;
			const lngVal = b.xCoord > 50 ? b.xCoord : b.yCoord;
			if (latVal >= 9.0 && latVal <= 10.5 && lngVal >= 123.0 && lngVal <= 124.5) {
				return [latVal, lngVal];
			}
		}
		// 3. Fallback coordinates for default mock campus buildings
		const defaultCoords: Record<string, [number, number]> = {
			'off-1': [9.894414, 123.882580],
			'off-2': [9.894720, 123.882350],
			'off-3': [9.894210, 123.882040],
			'off-4': [9.894850, 123.883120],
			'off-5': [9.895120, 123.882250]
		};
		return defaultCoords[b.id] || [9.894414, 123.882580];
	}

	function plotBuildingNodesOnMap() {
		if (!leafMap || !leafletInstance) return;
		const L = leafletInstance;

		buildingMarkers.forEach(m => leafMap.removeLayer(m));
		buildingMarkers = [];

		buildingsList.forEach((b: any) => {
			const coords = getBuildingLatLng(b);
			const color = b.color || '#3b82f6';
			
			const iconHtml = `
				<div class="group relative flex items-center justify-center cursor-pointer">
					<div class="px-2.5 py-1 rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-xl flex items-center gap-1.5 hover:scale-105 transition-transform" style="border-left: 4px solid ${color};">
						<div class="size-2 rounded-full animate-pulse" style="background-color: ${color};"></div>
						<span class="text-[11px] font-black text-foreground whitespace-nowrap">${b.code}</span>
					</div>
				</div>
			`;

			const marker = L.marker(coords, {
				icon: L.divIcon({
					className: "bg-transparent border-none",
					html: iconHtml,
					iconSize: [100, 32],
					iconAnchor: [50, 16]
				})
			}).addTo(leafMap);

			marker.on('click', () => {
				selectedBuildingForModal = b;
				isBuildingImageLoading = true;
				isBuildingModalOpen = true;
				leafMap.setView(coords, 20, { animate: false });
			});

			buildingMarkers.push(marker);
		});
	}

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
					
					// Background GPS Sync to visitor_logs
					const targetLogId = activeOfficialPass?.id || prePassData?.logId;
					if (targetLogId) {
						const body = new FormData();
						body.append('logId', targetLogId);
						body.append('lat', lat.toString());
						body.append('lng', lng.toString());
						fetch('?/updateLocation', { method: 'POST', body }).catch(e => console.warn("GPS sync fail:", e));
					}

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

	function resetVisitorProfile() {
		try {
			localStorage.removeItem('calapexis_visitor_profile');
			localStorage.removeItem('calapexis_active_pass');
		} catch (e) {}
		firstName = ''; middleName = ''; lastName = ''; email = ''; phone = ''; photoUrl = '';
		isReturningVisitor = false;
		registrationStep = 1;
		toast.info("Visitor profile reset. Register as a new visitor.");
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

				isGateOverlayOpen = false;
				registrationStep = 1;

				const targetOffice = officesList.find(o => o.id === data.officeId);
				if (targetOffice) {
					drawNavigationPathToOffice(targetOffice);
				}

				toast.success("Check-In Registered!", {
					description: `Pre-Pass created for ${data.officeName}. Map unlocked!`
				});
			} else if (result.type === 'failure') {
				toast.error(result.data?.message || "Registration failed.");
			}
		};
	}

	function moveVisitorToOfficeLocation(passOrPrePass: any) {
		if (!passOrPrePass) return;
		const targetOffice = officesList.find(o => 
			o.id === passOrPrePass.officeId || 
			o.name === passOrPrePass.officeName || 
			o.code === passOrPrePass.officeCode
		);

		let targetBuilding: any = null;
		if (targetOffice) {
			targetBuilding = buildingsList.find(b => b.id === targetOffice.buildingId) ||
			                 buildingsList.find(b => b.name === targetOffice.buildingName);
		}
		if (!targetBuilding && buildingsList.length > 0) {
			targetBuilding = buildingsList[0];
		}

		if (targetBuilding && targetBuilding.xCoord && targetBuilding.yCoord) {
			const lat = targetBuilding.xCoord;
			const lng = targetBuilding.yCoord;

			updateVisitorMarkerOnMap(
				lat,
				lng,
				`${passOrPrePass.fullName || 'Checked-In Visitor'} @ ${targetOffice?.name || targetBuilding.name}`
			);

			if (leafMap) {
				leafMap.flyTo([lat, lng], 20, { duration: 1.2 });
			}

			// Sync last_latitude and last_longitude in public.visitor_logs database table
			const targetLogId = passOrPrePass.id || passOrPrePass.logId;
			if (targetLogId) {
				const bodyData = new FormData();
				bodyData.append("logId", targetLogId);
				bodyData.append("lat", lat.toString());
				bodyData.append("lng", lng.toString());
				fetch("?/updateLocation", {
					method: "POST",
					body: bodyData
				}).catch(err => console.warn("Database location sync error:", err));
			}
		}
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

				moveVisitorToOfficeLocation(pass);

				toast.success("Check-In Complete!", {
					description: `Digital Pass ${pass.passCode} logged in database.`
				});
			} else if (result.type === 'failure') {
				toast.error(result.data?.message || "Check-In failed.");
			}
		};
	}

	function openGateOverlay() {
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
				registrationStep = 3;
			} catch (e) {
				console.warn("Failed to parse saved profile:", e);
			}
		} else {
			firstName = ''; middleName = ''; lastName = ''; email = ''; phone = ''; photoUrl = '';
			isReturningVisitor = false;
			registrationStep = 1;
		}
		isGateOverlayOpen = true;
	}

	function handleSelfCheckout() {
		if (activeOfficialPass || prePassData) {
			if (activeOfficialPass) checkoutLocalVisitor(activeOfficialPass.id);
			localStorage.removeItem('calapexis_active_pass');
			activeOfficialPass = null;
			prePassData = null;
			if (pathPolyline && leafMap) {
				leafMap.removeLayer(pathPolyline);
			}

			updateVisitorMarkerOnMap(mainGateCoords.lat, mainGateCoords.lng, "Visitor (Main Gate)");
			if (leafMap) {
				leafMap.flyTo([mainGateCoords.lat, mainGateCoords.lng], 19, { duration: 1.2 });
			}

			openGateOverlay();
			toast.info("Checked out of campus. Re-opened Campus Gate screen.");
		} else {
			openGateOverlay();
		}
	}

	function focusOfficeOnMap(office: Office) {
		if (leafMap) {
			leafMap.setView([9.894414, 123.882580], 20, { animate: false });
			toast.info(`Camera focused on ${office.name}.`);
		}
	}
</script>

<div class="relative w-full h-screen overflow-hidden bg-background text-foreground font-sans select-none">

	<!-- 1. FULLSCREEN CAMPUS GATE SETUP OVERLAY (INITIAL SETUP WIZARD) -->
	{#if isGateOverlayOpen}
		<div class="fixed inset-0 z-[2000] bg-background/95 backdrop-blur-3xl flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
			<div class="relative max-w-md w-full bg-card border border-border rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
				
				<!-- Gate Header & Logo -->
				<div class="text-center pt-2">
					<div class="size-16 bg-primary/10 border border-primary/20 text-primary rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-md">
						<span class="font-black text-2xl">C</span>
					</div>
					<h2 class="text-xl font-black text-foreground tracking-tight">BISU Calape Gate Check-In</h2>
					<p class="text-xs text-muted-foreground mt-0.5">Please register your details to unlock campus map & pass</p>
				</div>

				<!-- WIZARD STEP PROGRESS BAR -->
				<div class="flex items-center justify-between gap-2 px-1">
					<div class="flex-1 h-1.5 rounded-full {registrationStep >= 1 ? 'bg-primary' : 'bg-muted'} transition-colors"></div>
					<div class="flex-1 h-1.5 rounded-full {registrationStep >= 2 ? 'bg-primary' : 'bg-muted'} transition-colors"></div>
					<div class="flex-1 h-1.5 rounded-full {registrationStep >= 3 ? 'bg-primary' : 'bg-muted'} transition-colors"></div>
				</div>

				<!-- Step Header Title -->
				<div class="flex items-center gap-2 border-b border-border/60 pb-2">
					<UserCheckIcon class="size-5 text-primary" />
					<div class="text-start">
						<h3 class="text-sm font-black text-foreground">
							{#if registrationStep === 1}
								Step 1: Personal Information
							{:else if registrationStep === 2}
								Step 2: ID Photo Snapshot (Required)
							{:else}
								Step 3: Destination Office & Purpose
							{/if}
						</h3>
					</div>
				</div>

				<!-- SvelteKit Server Action Form -->
				<form action="?/register" method="POST" use:enhance={handleRegisterEnhance} class="flex flex-col gap-4 font-semibold text-xs">
					<input type="hidden" name="firstName" value={firstName} />
					<input type="hidden" name="middleName" value={middleName} />
					<input type="hidden" name="lastName" value={lastName} />
					<input type="hidden" name="email" value={email} />
					<input type="hidden" name="phone" value={phone} />
					<input type="hidden" name="photoUrl" value={photoUrl} />
					<input type="hidden" name="officeId" value={selectedOfficeId} />
					<input type="hidden" name="purpose" value={purpose} />
					<input type="hidden" name="lat" value={userGps?.lat || ''} />
					<input type="hidden" name="lng" value={userGps?.lng || ''} />

					{#if registrationStep === 1}
						<!-- STEP 1: PERSONAL DETAILS -->
						{#if isGooglePreFilled}
							<div class="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs font-semibold">
								<div class="flex items-center gap-2">
									<SparklesIcon class="size-4 text-emerald-500" />
									<span class="font-bold text-foreground">Google Account Details Auto-Filled</span>
								</div>
								<Badge variant="outline" class="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30">Google Verified</Badge>
							</div>
						{:else if isReturningVisitor}
							<div class="p-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs font-semibold">
								<div class="flex items-center gap-2">
									<SparklesIcon class="size-4 text-primary" />
									<span class="font-bold text-foreground">Saved Profile Auto-Filled</span>
								</div>
								<button type="button" onclick={clearSavedProfile} class="text-[10px] text-primary font-black uppercase hover:underline cursor-pointer">Clear</button>
							</div>
						{:else}
							<Button
								type="button"
								variant="outline"
								onclick={handleVisitorGoogleSignIn}
								class="w-full h-10 rounded-xl border-border bg-card hover:bg-muted/50 font-extrabold text-xs flex items-center justify-center gap-2.5 shadow-xs transition-all cursor-pointer mb-1"
							>
								<svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
									<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
									<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
									<path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
									<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
								</svg>
								<span>Fill-Up via Google</span>
							</Button>
							<Field.FieldSeparator class="text-[10px] text-muted-foreground font-bold mb-1">or enter details manually</Field.FieldSeparator>
						{/if}

						<Field.FieldGroup class="flex flex-col gap-3">
							<div class="grid grid-cols-3 gap-2">
								<Field.Field>
									<Field.FieldLabel for="gate-firstName">First Name *</Field.FieldLabel>
									<Input id="gate-firstName" bind:value={firstName} placeholder="Juan" required class="rounded-xl h-9 text-xs" />
								</Field.Field>
								<Field.Field>
									<Field.FieldLabel for="gate-middleName">Middle</Field.FieldLabel>
									<Input id="gate-middleName" bind:value={middleName} placeholder="de la" class="rounded-xl h-9 text-xs" />
								</Field.Field>
								<Field.Field>
									<Field.FieldLabel for="gate-lastName">Last Name *</Field.FieldLabel>
									<Input id="gate-lastName" bind:value={lastName} placeholder="Cruz" required class="rounded-xl h-9 text-xs" />
								</Field.Field>
							</div>

							<div class="grid grid-cols-2 gap-2">
								<Field.Field>
									<Field.FieldLabel for="gate-email">Email (Optional)</Field.FieldLabel>
									<Input id="gate-email" type="email" bind:value={email} placeholder="juan@gmail.com" class="rounded-xl h-9 text-xs" />
								</Field.Field>
								<Field.Field>
									<Field.FieldLabel for="gate-phone">Phone (Optional)</Field.FieldLabel>
									<Input id="gate-phone" type="tel" bind:value={phone} placeholder="+63 917..." class="rounded-xl h-9 text-xs" />
								</Field.Field>
							</div>
						</Field.FieldGroup>

						<div class="pt-2 flex flex-col gap-2">
							<Button type="button" onclick={goToNextStep} class="w-full bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-11 gap-1.5 cursor-pointer shadow-md">
								<span>Next: Photo Snapshot</span>
								<ArrowRightIcon data-icon="inline-end" />
							</Button>
							<Button type="button" onclick={() => isGateOverlayOpen = false} variant="ghost" class="w-full text-xs font-bold text-muted-foreground rounded-xl h-9 cursor-pointer">
								<span>Bypass & Open Map</span>
							</Button>
						</div>

					{:else if registrationStep === 2}
						<!-- STEP 2: PHOTO SNAPSHOT OR UPLOAD (REQUIRED) -->
						<div class="flex flex-col gap-3">
							<div class="flex flex-col gap-2 items-center p-4 rounded-2xl border border-border bg-muted/40 text-center">
								{#if photoUrl}
									<img src={photoUrl} alt="Selfie Preview" class="size-28 rounded-full object-cover border-4 border-primary/30 shadow-lg" />
									<span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Photo Captured & Optimized!</span>
									<Button type="button" onclick={startSelfieCamera} variant="outline" size="sm" class="text-xs font-bold rounded-xl h-8 gap-1 mt-1">
										<RefreshCwIcon data-icon="inline-start" />
										<span>Retake Camera</span>
									</Button>
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

						<div class="pt-2 flex gap-2">
							<Button type="button" onclick={goToPrevStep} variant="outline" class="flex-1 text-xs font-semibold rounded-xl h-10 gap-1.5 cursor-pointer">
								<ArrowLeftIcon data-icon="inline-start" />
								<span>Back</span>
							</Button>
							<Button type="button" onclick={goToNextStep} class="flex-1 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-10 gap-1.5 cursor-pointer shadow-md">
								<span>Next: Office Step</span>
								<ArrowRightIcon data-icon="inline-end" />
							</Button>
						</div>

					{:else if registrationStep === 3}
						<!-- STEP 3: DESTINATION OFFICE & PURPOSE -->
						{#if isReturningVisitor}
							<div class="p-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs font-semibold mb-1">
								<div class="flex items-center gap-2">
									<SparklesIcon class="size-4 text-primary shrink-0" />
									<div class="text-start">
										<span class="font-black text-foreground block">Welcome back, {firstName}!</span>
										<span class="text-[10px] text-muted-foreground font-normal">Using your saved visitor profile.</span>
									</div>
								</div>
								<button type="button" onclick={resetVisitorProfile} class="text-[10px] text-primary font-black uppercase hover:underline cursor-pointer">Not You?</button>
							</div>
						{/if}

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
									<Popover.Content align="start" sideOffset={6} class="w-[var(--bits-popover-anchor-width)] max-w-xs p-0 max-h-60 overflow-y-auto z-[2500] border-border bg-popover text-popover-foreground rounded-2xl shadow-2xl">
										<Command.Root class="w-full">
											<Command.Input placeholder="Search office or department..." class="h-10 text-xs px-3 border-b border-border/60" />
											<Command.List class="p-1 max-h-48 overflow-y-auto">
												<Command.Empty class="p-3 text-xs text-muted-foreground text-center">No office found.</Command.Empty>
												<Command.Group>
													{#each officesList as office}
														<Command.Item
															value={office.name}
															onSelect={() => {
																selectedOfficeId = office.id;
																isOfficeComboOpen = false;
															}}
															class="text-xs font-semibold cursor-pointer rounded-xl px-3 py-2.5 flex items-center justify-between hover:bg-muted/60 transition-colors"
														>
															<div class="flex flex-col text-start">
																<span class="font-extrabold text-foreground">{office.name}</span>
																<span class="text-[10px] text-muted-foreground font-mono">{office.code}</span>
															</div>
															{#if selectedOfficeId === office.id}
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
								<Field.FieldLabel for="gate-purpose">Purpose of Visit *</Field.FieldLabel>
								<Input id="gate-purpose" bind:value={purpose} placeholder="e.g. Transcript of Records Request" required class="rounded-xl h-9 text-xs" />
							</Field.Field>
						</Field.FieldGroup>

						<div class="pt-2 flex gap-2">
							{#if isReturningVisitor}
								<Button type="button" onclick={resetVisitorProfile} variant="outline" class="flex-1 text-xs font-semibold rounded-xl h-10 gap-1.5 cursor-pointer">
									<span>Not You?</span>
								</Button>
							{:else}
								<Button type="button" onclick={goToPrevStep} variant="outline" class="flex-1 text-xs font-semibold rounded-xl h-10 gap-1.5 cursor-pointer">
									<ArrowLeftIcon data-icon="inline-start" />
									<span>Back</span>
								</Button>
							{/if}
							<Button type="submit" disabled={isSubmittingRegister} class="flex-1 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-10 cursor-pointer shadow-md">
								<span>{isSubmittingRegister ? 'Saving...' : 'Check In & Unlock Map'}</span>
							</Button>
						</div>
					{/if}
				</form>
			</div>
		</div>
	{/if}

	<!-- 2. INTERACTIVE MAP PORTAL CANVAS & FLOATING OVERLAYS -->
	<!-- TOP FLOATING MAP SEARCH BAR (`InputGroup`) -->
	<div class="absolute top-4 left-4 right-4 z-50 max-w-xl mx-auto pointer-events-auto">
		<InputGroup.Root class="shadow-2xl rounded-2xl bg-card/95 backdrop-blur-xl border border-border transition-all flex items-center">
		<InputGroup.Addon>
		<SearchIcon class="size-4 text-primary opacity-80" />
		</InputGroup.Addon>
			<InputGroup.Input 
				placeholder="Search building, office, or room..." 
				bind:value={searchQuery}
				onfocus={() => isSearchOpen = true}
				class="h-12 text-xs font-semibold pl-4 bg-transparent text-foreground placeholder:text-muted-foreground"
			/>
			<InputGroup.Addon align="inline-end" class="pr-2 flex items-center gap-1">
				<!-- Map Layer Controls Popover -->
				<Popover.Root bind:open={isLayersPopoverOpen}>
					<Popover.Trigger>
						<Button variant="ghost" size="icon" class="size-8 rounded-xl hover:bg-muted cursor-pointer" title="Map Layers & 3D Overlay">
							<LayersIcon class="size-4 text-primary" />
						</Button>
					</Popover.Trigger>
					<Popover.Content align="end" sideOffset={8} class="w-64 p-4 z-[2500] border-border bg-popover text-popover-foreground rounded-2xl shadow-2xl flex flex-col gap-3 font-semibold text-xs">
						<div class="flex items-center gap-1.5 text-xs font-black text-foreground border-b border-border/60 pb-2">
							<Layers2Icon class="size-4 text-primary" />
							<span>Map Layer Options</span>
						</div>

						<!-- Base Tile Layer Selector -->
						<div class="flex flex-col gap-1.5">
							<span class="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Base Satellite / Map</span>
							<div class="grid grid-cols-2 gap-1.5">
								<button 
									type="button" 
									onclick={() => activeTileLayer = 'osm'}
									class="p-2 rounded-xl border text-xs font-extrabold cursor-pointer transition-colors flex items-center justify-center gap-1 {activeTileLayer === 'osm' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 border-border text-foreground hover:bg-muted'}"
								>
									<span>Standard</span>
								</button>
								<button 
									type="button" 
									onclick={() => activeTileLayer = 'esri'}
									class="p-2 rounded-xl border text-xs font-extrabold cursor-pointer transition-colors flex items-center justify-center gap-1 {activeTileLayer === 'esri' ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 border-border text-foreground hover:bg-muted'}"
								>
									<span>Satellite</span>
								</button>
							</div>
						</div>

						<Separator class="my-0.5" />

						<!-- 3D Campus Overlay Switch -->
						<div class="flex items-center justify-between">
							<div class="flex flex-col">
								<span class="text-xs font-bold text-foreground">3D Campus Map</span>
								<span class="text-[10px] text-muted-foreground">Adjusted Campus Overlay</span>
							</div>
							<Switch bind:checked={showCampusOverlay} />
						</div>
					</Popover.Content>
				</Popover.Root>

				<!-- GPS Centering Button -->
				<Button onclick={requestDeviceGps} variant="ghost" size="icon" class="size-8 rounded-xl hover:bg-muted cursor-pointer" title="Center Device GPS">
					<NavigationIcon class="size-4 text-primary {gpsStatus === 'locating' ? 'animate-spin' : ''}" />
				</Button>

				<!-- Theme Toggler -->
				<!-- <AnimatedThemeToggler /> -->
			</InputGroup.Addon>
		</InputGroup.Root>

		<!-- Categorized Search Suggestions Dropdown -->
		{#if isSearchOpen && searchQuery.trim()}
			<Card.Root class="mt-2 shadow-2xl border-border rounded-2xl bg-card/95 backdrop-blur-xl max-h-72 overflow-y-auto pointer-events-auto">
				<Card.Content class="p-2 flex flex-col gap-2 divide-y divide-border/40">
					<!-- 1. BUILDINGS & LANDMARKS -->
					{#if searchResults.buildings.length > 0}
						<div class="flex flex-col gap-1 pt-1">
							<div class="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
								<SchoolIcon class="size-3 text-primary shrink-0" />
								<span>Buildings & Landmarks ({searchResults.buildings.length})</span>
							</div>
							{#each searchResults.buildings as b}
								<button 
									type="button"
									onclick={() => focusSearchResult(b, 'building')}
									class="w-full text-start p-2 rounded-xl hover:bg-muted/60 transition-colors flex items-center justify-between text-xs font-semibold cursor-pointer"
								>
									<div class="flex flex-col">
										<span class="font-extrabold text-foreground">{b.name}</span>
										<span class="text-[10px] text-muted-foreground font-mono">{b.code} • {b.floors || 1} Floors</span>
									</div>
									<Badge variant="outline" class="text-[9px] font-extrabold border-primary/30 text-primary">BUILDING</Badge>
								</button>
							{/each}
						</div>
					{/if}

					<!-- 2. DEPARTMENTS & OFFICES -->
					{#if searchResults.offices.length > 0}
						<div class="flex flex-col gap-1 pt-2">
							<div class="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
								<Building2Icon class="size-3 text-emerald-500 shrink-0" />
								<span>Departments & Reception Desks ({searchResults.offices.length})</span>
							</div>
							{#each searchResults.offices as o}
								<button 
									type="button"
									onclick={() => focusSearchResult(o, 'office')}
									class="w-full text-start p-2 rounded-xl hover:bg-muted/60 transition-colors flex items-center justify-between text-xs font-semibold cursor-pointer"
								>
									<div class="flex flex-col">
										<span class="font-extrabold text-foreground">{o.name}</span>
										<span class="text-[10px] text-muted-foreground font-mono">{o.code} • Head: {o.headPerson || 'Staff'}</span>
									</div>
									<Badge variant="secondary" class="text-[9px] font-mono font-bold">{o.code}</Badge>
								</button>
							{/each}
						</div>
					{/if}

					<!-- 3. CLASSROOMS & ROOMS -->
					{#if searchResults.rooms.length > 0}
						<div class="flex flex-col gap-1 pt-2">
							<div class="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
								<DoorClosedIcon class="size-3 text-indigo-500 shrink-0" />
								<span>Rooms & Classrooms ({searchResults.rooms.length})</span>
							</div>
							{#each searchResults.rooms as r}
								<button 
									type="button"
									onclick={() => focusSearchResult(r, 'room')}
									class="w-full text-start p-2 rounded-xl hover:bg-muted/60 transition-colors flex items-center justify-between text-xs font-semibold cursor-pointer"
								>
									<div class="flex flex-col">
										<span class="font-extrabold text-foreground">{r.roomName} ({r.roomNumber})</span>
										<span class="text-[10px] text-muted-foreground">{r.floor} Floor</span>
									</div>
									<Badge variant="outline" class="text-[9px] font-mono">ROOM</Badge>
								</button>
							{/each}
						</div>
					{/if}

					{#if searchResults.buildings.length === 0 && searchResults.offices.length === 0 && searchResults.rooms.length === 0}
						<div class="p-4 text-center text-xs text-muted-foreground font-semibold">
							No campus building, office, or room matches "{searchQuery}".
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	<!-- MAIN LEAFLET MAP CANVAS -->
	<div bind:this={mapContainer} class="absolute inset-0 z-0"></div>

	<!-- BOTTOM FLOATING MAP HUD BAR (Pass Details, QR Scan & Check-Out Controls) -->
	<div class="absolute bottom-6 left-4 right-4 z-50 max-w-lg mx-auto pointer-events-auto">
		<div class="p-4 rounded-3xl bg-card/95 backdrop-blur-2xl border border-border shadow-2xl flex flex-col gap-3 font-semibold text-xs text-card-foreground">
			<!-- Drawer Handle Bar Indicator Pill -->
			<div class="w-10 h-1 bg-muted-foreground/30 hover:bg-muted-foreground/50 rounded-full mx-auto mb-1 shrink-0 transition-colors"></div>
			{#if activeOfficialPass}
				<!-- OFFICIAL PASS ACTIVE HUD -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Badge variant="outline" class="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] border-emerald-500/30 gap-1">
							<CheckCircleIcon class="size-3" />
							CHECKED IN
						</Badge>
						<span class="font-bold text-foreground">{activeOfficialPass.fullName}</span>
					</div>
					<span class="font-mono text-xs font-black text-primary">{activeOfficialPass.passCode}</span>
				</div>

				<div class="flex items-center justify-between text-[11px] bg-muted/40 p-2.5 rounded-xl border border-border">
					<div>
						<span class="text-muted-foreground block text-[9px] uppercase font-bold tracking-wider">Office Destination</span>
						<div class="font-extrabold text-foreground">{activeOfficialPass.officeName || 'Campus Office'}</div>
					</div>
					<Button onclick={handleSelfCheckout} variant="destructive" size="sm" class="font-extrabold text-xs rounded-xl h-8 gap-1 cursor-pointer">
						<LogOutIcon data-icon="inline-start" class="size-3.5" />
						<span>Check Out</span>
					</Button>
				</div>

			{:else if prePassData}
				<!-- PRE-PASS ACTIVE HUD (Pending QR Desk Check-In) -->
				<div class="flex items-center justify-between">
					<Badge variant="outline" class="bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold text-[10px] border-amber-500/30 gap-1">
						<RadioIcon class="size-3 animate-pulse" />
						PRE-PASS: {prePassData.officeName}
					</Badge>
					<span class="text-[10px] text-muted-foreground font-bold">{prePassData.fullName}</span>
				</div>

				<div class="flex gap-2">
					<Button onclick={() => isScannerModalOpen = true} class="flex-1 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-10 gap-1.5 cursor-pointer shadow-xs">
						<QrCodeIcon data-icon="inline-start" />
						<span>Scan Office QR Desk</span>
					</Button>
					<Button onclick={handleSelfCheckout} variant="outline" class="font-bold text-xs rounded-xl h-10 gap-1 cursor-pointer">
						<LogOutIcon data-icon="inline-start" class="size-3.5" />
						<span>Gate Screen</span>
					</Button>
				</div>

			{:else}
				<!-- UNREGISTERED MAP HUD -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2 text-primary font-black text-xs">
						<SparklesIcon class="size-4" />
						<span>Visiting Campus?</span>
					</div>
					<Badge variant="outline" class="text-[9px]">Map Active</Badge>
				</div>

				<div class="flex gap-2">
					<Button onclick={openGateOverlay} class="flex-1 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-10 gap-1.5 cursor-pointer shadow-md">
						<UserCheckIcon data-icon="inline-start" />
						<span>Open Registration Gate</span>
					</Button>
					<Button onclick={() => isScannerModalOpen = true} variant="outline" class="flex-1 font-bold text-xs rounded-xl h-10 gap-1.5 cursor-pointer">
						<QrCodeIcon data-icon="inline-start" />
						<span>Scan Office QR</span>
					</Button>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- 3. BUILDING & ROOMS DETAILS MODAL (`Dialog.Root`) -->
<Dialog.Root bind:open={isBuildingModalOpen}>
	<Dialog.Portal>
		<Dialog.Content class="z-[2500] max-w-lg border-border bg-card text-card-foreground shadow-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
			{#if selectedBuildingForModal}
				<Dialog.Header class="pb-2">
					<div class="flex items-center justify-between">
						<Badge variant="outline" class="text-[10px] font-mono border-primary/30 text-primary uppercase">
							{selectedBuildingForModal.code} • {selectedBuildingForModal.floors || 1} Floors
						</Badge>
					</div>
					<Dialog.Title class="text-lg font-black text-foreground mt-1">{selectedBuildingForModal.name}</Dialog.Title>
					<Dialog.Description class="text-xs text-muted-foreground">
						{selectedBuildingForModal.description || 'Campus Academic & Administration Landmark'}
					</Dialog.Description>
				</Dialog.Header>

				<!-- Building Landmark Photo -->
				{#if selectedBuildingForModal.imageUrl}
					<div class="relative w-full h-44 rounded-2xl overflow-hidden border border-border my-2 shadow-inner bg-muted">
						{#if isBuildingImageLoading}
							<Skeleton class="absolute inset-0 size-full rounded-2xl z-10" />
						{/if}
						<img 
							src={selectedBuildingForModal.imageUrl} 
							alt={selectedBuildingForModal.name} 
							onload={() => isBuildingImageLoading = false}
							onerror={() => isBuildingImageLoading = false}
							class="size-full object-cover transition-opacity duration-300 {isBuildingImageLoading ? 'opacity-0' : 'opacity-100'}" 
						/>
					</div>
				{/if}

				<!-- Building Meta Info -->
				<div class="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-3 rounded-2xl border border-border/60 my-2">
					<div class="flex items-center gap-2">
						<UserIcon class="size-4 text-primary shrink-0" />
						<div>
							<span class="text-[9px] uppercase font-bold text-muted-foreground block">Building Head</span>
							<span class="font-extrabold text-foreground">{selectedBuildingForModal.headPerson || 'N/A'}</span>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<MailIcon class="size-4 text-primary shrink-0" />
						<div>
							<span class="text-[9px] uppercase font-bold text-muted-foreground block">Contact Email</span>
							<span class="font-mono text-[11px] font-bold text-foreground truncate block max-w-[130px]">{selectedBuildingForModal.contactEmail || 'N/A'}</span>
						</div>
					</div>
				</div>

				<!-- Department Offices List inside this Building -->
				<div class="flex flex-col gap-2 pt-2 font-semibold text-xs">
					<div class="flex items-center justify-between border-b border-border/60 pb-1.5">
						<span class="font-black text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
							<Building2Icon class="size-4 text-emerald-500" />
							<span>Department Offices ({selectedBuildingOffices.length})</span>
						</span>
					</div>

					{#if selectedBuildingOffices.length > 0}
						<div class="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
							{#each selectedBuildingOffices as office}
								<div class="p-3 rounded-2xl border border-border/80 bg-background/80 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3">
									<div class="flex flex-col gap-0.5 text-start">
										<div class="flex items-center gap-2">
											<span class="font-black text-foreground">{office.name}</span>
											<Badge class="bg-primary/15 text-primary font-mono font-black text-[9px] px-2 py-0 rounded-md">
												{office.code}
											</Badge>
										</div>
										<span class="text-[10px] text-muted-foreground font-semibold">
											Officer in Charge: {office.headPerson || 'Staff Desk'}
										</span>
										{#if office.contactEmail}
											<span class="text-[10px] text-muted-foreground font-mono">
												Email: {office.contactEmail}
											</span>
										{/if}
									</div>
									{#if office.operatingHours}
										<Badge variant="outline" class="text-[9px] font-mono shrink-0">
											{office.operatingHours}
										</Badge>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<div class="p-3 text-center text-xs text-muted-foreground rounded-2xl border border-dashed border-border bg-muted/20">
							No department offices registered in this landmark building.
						</div>
					{/if}
				</div>

				<!-- Rooms List inside this Building -->
				<div class="flex flex-col gap-2 pt-2 font-semibold text-xs">
					<div class="flex items-center justify-between border-b border-border/60 pb-1.5">
						<span class="font-black text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5">
							<DoorClosedIcon class="size-4 text-primary" />
							<span>Building Rooms ({selectedBuildingRooms.length})</span>
						</span>
					</div>

					{#if selectedBuildingRooms.length > 0}
						<div class="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
							{#each selectedBuildingRooms as room}
								<div class="p-3 rounded-2xl border border-border/80 bg-background/80 hover:bg-muted/30 transition-colors flex items-start gap-3">
									{#if room.imageUrl}
										<div class="relative size-12 rounded-xl overflow-hidden border border-border shrink-0 bg-muted">
											<Skeleton class="absolute inset-0 size-full rounded-xl pointer-events-none" />
											<img 
												src={room.imageUrl} 
												alt={room.roomName} 
												onload={(e) => { (e.currentTarget as HTMLImageElement).previousElementSibling?.classList.add('hidden'); }}
												onerror={(e) => { (e.currentTarget as HTMLImageElement).previousElementSibling?.classList.add('hidden'); }}
												class="relative size-full object-cover z-10" 
											/>
										</div>
									{:else}
										<div class="size-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
											{room.roomNumber.slice(0, 4)}
										</div>
									{/if}
									<div class="flex-1 text-start">
										<div class="flex items-center justify-between">
											<span class="font-black text-foreground">{room.roomName}</span>
											<Badge variant="outline" class="text-[9px] font-mono">{room.floor}</Badge>
										</div>
										<div class="text-[10px] text-muted-foreground font-mono font-bold">{room.roomNumber}</div>
										{#if room.description}
											<p class="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{room.description}</p>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div class="p-4 text-center text-xs text-muted-foreground rounded-2xl border border-dashed border-border bg-muted/20">
							No specific room records logged for this landmark.
						</div>
					{/if}
				</div>

				<Dialog.Footer class="pt-3 border-t border-border/60">
					<Button onclick={() => isBuildingModalOpen = false} variant="outline" class="w-full text-xs font-semibold rounded-xl h-10 cursor-pointer">
						Close Building Details
					</Button>
				</Dialog.Footer>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<!-- STEP 4 OFFICE QR CODE SCANNER MODAL (`Dialog.Root`) -->
<Dialog.Root bind:open={isScannerModalOpen}>
	<Dialog.Portal>
		<Dialog.Content class="z-[2500] max-w-md border-border bg-card text-card-foreground shadow-2xl rounded-3xl">
			<Dialog.Header>
				<Dialog.Title class="text-base font-black text-foreground flex items-center gap-2">
					<QrCodeIcon class="size-5 text-primary" />
					<span>Scan Office QR Code</span>
				</Dialog.Title>
				<Dialog.Description class="text-xs text-muted-foreground">
					Point your camera at the QR code displayed on the office door or reception desk.
				</Dialog.Description>
			</Dialog.Header>

			<div class="flex flex-col gap-4 py-3 items-center text-center font-semibold text-xs">
				<!-- Live Active Camera Feed Container -->
				<div class="relative w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden bg-black border-2 border-primary/50 shadow-inner flex items-center justify-center">
					<div id="qr-reader" class="w-full h-full object-cover"></div>
					{#if !isQrScanning && !qrScanError}
						<div class="absolute inset-0 flex flex-col items-center justify-center bg-card p-4">
							<QrCodeIcon class="size-12 text-primary/50 animate-pulse" />
							<span class="text-xs font-bold text-muted-foreground mt-2">Starting Camera...</span>
						</div>
					{/if}
					{#if qrScanError}
						<div class="absolute inset-0 flex flex-col items-center justify-center bg-card/95 p-4 text-center">
							<span class="text-xs font-bold text-destructive">{qrScanError}</span>
						</div>
					{/if}
				</div>

				<!-- Hidden Programmatic Auto-Submission Form for QR Scanner -->
				<form bind:this={checkInFormElement} action="?/checkIn" method="POST" use:enhance={handleCheckInEnhance} class="hidden">
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
					<input bind:this={hiddenOfficeCodeInput} type="hidden" name="officeCode" value="" />
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
		transition: none !important;
	}
</style>
