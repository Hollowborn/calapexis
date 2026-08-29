<script lang="ts">
	import { onMount, onDestroy } from "svelte";
	import { enhance } from "$app/forms";
	import { page } from "$app/state";
	import { Html5Qrcode } from "html5-qrcode";
	import * as Card from "$lib/components/ui/card/index.js";
	import * as Dialog from "$lib/components/ui/dialog/index.js";
	import * as Field from "$lib/components/ui/field/index.js";
	import * as InputGroup from "$lib/components/ui/input-group/index.js";
	import * as Popover from "$lib/components/ui/popover/index.js";
	import * as Command from "$lib/components/ui/command/index.js";
	import { Switch } from "$lib/components/ui/switch/index.js";
	import { Skeleton } from "$lib/components/ui/skeleton/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Separator } from "$lib/components/ui/separator/index.js";
	import { toast } from "svelte-sonner";
	import * as Alert from "$lib/components/ui/alert/index.js";
	import { checkoutLocalVisitor, signInWithGoogle, isSupabaseConfigured, supabase, getDbClient } from "$lib/supabase";
	import type { Visitor, Office, Building, Room } from "$lib/types";
	import { AnimatedThemeToggler } from "$lib/components/magic/animated-theme-toggler";
	import LazyImage from "$lib/components/LazyImage.svelte";

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
	import CompassIcon from "@lucide/svelte/icons/compass";
	import RouteIcon from "@lucide/svelte/icons/route";
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
	import XIcon from "@lucide/svelte/icons/x";
	import MapPinOffIcon from "@lucide/svelte/icons/map-pin-off";
	import ListIcon from "@lucide/svelte/icons/list";
	import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import EyeOffIcon from "@lucide/svelte/icons/eye-off";
	import FootprintsIcon from "@lucide/svelte/icons/footprints";
	import ClockIcon from "@lucide/svelte/icons/clock";

	let { data } = $props();

	let officesList = $derived(data?.offices || []);
	let buildingsList = $derived(data?.buildings || []);
	let roomsList = $derived(data?.rooms || []);

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

	// Dynamic Graph Pathfinding & Device Orientation state
	let mapEdgesList = $derived(data.mapEdges || []);
	let activeRouteMode = $state<"primary" | "alternative">("primary");
	let primaryPathPoints = $state<[number, number][]>([]);
	let alternativePathPoints = $state<[number, number][]>([]);
	let primaryDistanceMeters = $state<number>(0);
	let alternativeDistanceMeters = $state<number>(0);
	let deviceHeading = $state<number>(0);
	let isCompassActive = $state<boolean>(false);

	let activeRouteDistance = $derived(
		activeRouteMode === "primary"
			? primaryDistanceMeters
			: alternativeDistanceMeters,
	);
	let activeRouteMins = $derived(Math.floor(activeRouteDistance / 81));
	let activeRouteSecs = $derived(
		Math.round((activeRouteDistance % 81) / 1.35),
	);

	let primaryPolyline: any = null;
	let alternativePolyline: any = null;
	let isNavDrawerOpen = $state(false);

	function removePathDisplay() {
		if (primaryPolyline && leafMap) leafMap.removeLayer(primaryPolyline);
		if (alternativePolyline && leafMap)
			leafMap.removeLayer(alternativePolyline);
		primaryPolyline = null;
		alternativePolyline = null;
		isRouteCardActive = false;
		isNavDrawerOpen = false;
		toast.info("Path display removed from map.");
	}

	// Layer Control & Map state
	let activeTileLayer = $state<"osm" | "esri">("osm");
	let showCampusOverlay = $state(true);
	let isLayersPopoverOpen = $state(false);

	// Floating Search & Filter state
	let searchQuery = $state("");
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
	// 3-Step Wizard Navigation State
	let registrationStep = $state<1 | 2 | 3>(1);

	// Registration Form Fields
	let firstName = $state("");
	let middleName = $state("");
	let lastName = $state("");
	let email = $state("");
	let phone = $state("");
	let purpose = $state("");
	let purposeSearchInput = $state("");

	const COMMON_VISIT_PURPOSES = [
		"Official Business / Document Submission",
		"Transcript of Records / Diploma Request",
		"Student Inquiry / Admission & Enrollment",
		"Faculty & Staff Appointment",
		"Facilities & Campus Inspection / Maintenance",
		"Cashier Payment / Financial Settlement",
		"Class Observation / Academic Research",
		"Supplier / Delivery Service",
		"Event / Conference Attendance",
	];

	// Dialog Selectors State (Mobile UX)
	let isOfficeDialogOpen = $state(false);
	let officeSearchQuery = $state("");
	let isPurposeDialogOpen = $state(false);

	let filteredOfficesList = $derived.by(() => {
		if (!officeSearchQuery.trim()) return officesList;
		const q = officeSearchQuery.toLowerCase().trim();
		return officesList.filter(
			(o: any) =>
				o.name?.toLowerCase().includes(q) ||
				o.code?.toLowerCase().includes(q) ||
				o.buildingName?.toLowerCase().includes(q)
		);
	});

	let filteredCommonPurposes = $derived.by(() => {
		if (!purposeSearchInput.trim()) return COMMON_VISIT_PURPOSES;
		const q = purposeSearchInput.toLowerCase().trim();
		return COMMON_VISIT_PURPOSES.filter((p) => p.toLowerCase().includes(q));
	});

	let selectedOfficeId = $state("");
	let hostPerson = $state("");
	let photoUrl = $state("");
	let isCameraActive = $state(false);
	let videoElement = $state<HTMLVideoElement | null>(null);
	let canvasElement = $state<HTMLCanvasElement | null>(null);

	let isGooglePreFilled = $state(false);

	async function handleVisitorGoogleSignIn() {
		try {
			toast.promise(
				signInWithGoogle(
					data.supabase,
					`${window.location.origin}/auth/callback?next=/v`,
				),
				{
					loading: "Connecting to Google Account...",
					success: "Redirecting to Google...",
					error: (err: any) =>
						err?.message ||
						"Failed to launch Google authentication.",
				},
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
				description: `Welcome ${g.fullName || g.email}! Please select your destination office.`,
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
	let fileInputElement = $state<HTMLInputElement | null>(null);
	let visitorRealtimeChannel: any = null;

	function setupVisitorRealtimeSubscription(logId: string) {
		if (!isSupabaseConfigured || !supabase || !logId) return;
		const dbClient = getDbClient();

		if (visitorRealtimeChannel) {
			try {
				dbClient.removeChannel(visitorRealtimeChannel);
			} catch (e) {}
			visitorRealtimeChannel = null;
		}

		visitorRealtimeChannel = dbClient
			.channel(`realtime:visitor-pass-${logId}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "visitor_logs",
					filter: `id=eq.${logId}`
				},
				(payload: any) => {
					if (payload.new && payload.new.status === "checked_out") {
						handleExternalCheckout("staff");
					}
				}
			)
			.subscribe();
	}

	async function verifyActivePassStatus() {
		const currentLogId = activeOfficialPass?.id || prePassData?.logId;
		if (!currentLogId || !isSupabaseConfigured || !supabase) return;
		try {
			const dbClient = getDbClient();
			const { data } = await dbClient
				.from("visitor_logs")
				.select("status")
				.eq("id", currentLogId)
				.maybeSingle();

			if (data && data.status === "checked_out") {
				handleExternalCheckout("staff");
			}
		} catch (e) {
			console.warn("Pass status verification check failed:", e);
		}
	}

	const handleVisibilityOrFocus = () => {
		if (typeof document !== "undefined" && document.visibilityState === "visible") {
			verifyActivePassStatus();
		}
	};

	function handleExternalCheckout(reason: "staff" | "manual" = "staff") {
		try {
			localStorage.removeItem("calapexis_active_pass");
		} catch (e) {}

		activeOfficialPass = null;
		prePassData = null;

		if (visitorRealtimeChannel && isSupabaseConfigured && supabase) {
			try {
				const dbClient = getDbClient();
				dbClient.removeChannel(visitorRealtimeChannel);
			} catch (e) {}
			visitorRealtimeChannel = null;
		}

		if (pathPolyline && leafMap) {
			leafMap.removeLayer(pathPolyline);
		}

		updateVisitorMarkerOnMap(
			mainGateCoords.lat,
			mainGateCoords.lng,
			"Visitor (Main Gate)"
		);

		if (leafMap) {
			leafMap.flyTo([mainGateCoords.lat, mainGateCoords.lng], 19, {
				duration: 1.2
			});
		}

		openGateOverlay();

		if (reason === "staff") {
			toast.info("Your visitor pass was checked out by campus staff.", {
				description: "Welcome back to the campus registration desk."
			});
		}
	}

	// GPS Location State
	let userGps = $state<{ lat: number; lng: number } | null>(null);
	let gpsStatus = $state<"disabled" | "locating" | "active">("disabled");

	let manualScanCode = $state("");
	let qrScannerInstance: Html5Qrcode | null = $state(null);
	let isQrScanning = $state(false);
	let qrScanError = $state<string | null>(null);
	let qrScanErrorAlert = $state<string | null>(null);
	let checkInFormElement = $state<HTMLFormElement | null>(null);
	let hiddenOfficeCodeInput = $state<HTMLInputElement | null>(null);

	async function startQrScanner() {
		if (typeof window === "undefined") return;
		qrScanError = null;
		isQrScanning = true;

		try {
			await new Promise((r) => setTimeout(r, 150));
			const container = document.getElementById("qr-reader");
			if (!container) return;

			if (qrScannerInstance) {
				try {
					await qrScannerInstance.stop();
				} catch (e) {}
			}

			qrScannerInstance = new Html5Qrcode("qr-reader");
			await qrScannerInstance.start(
				{ facingMode: "environment" },
				{
					fps: 10,
					qrbox: { width: 200, height: 200 },
				},
				(decodedText) => {
					handleQrScannedCode(decodedText);
				},
				() => {},
			);
		} catch (err: any) {
			console.warn("QR Scanner camera error:", err);
			isQrScanning = false;
			qrScanError =
				"Camera access unavailable or denied. Please enter the office code manually below.";
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

	function validateScannedOfficeCode(code: string): boolean {
		if (!code || !code.trim()) {
			qrScanErrorAlert = "Please scan or enter an office desk QR code.";
			return false;
		}

		const currentDesignatedId =
			selectedOfficeId ||
			prePassData?.officeId ||
			activeOfficialPass?.officeId;
		const targetOfficeObj = officesList.find(
			(o: any) =>
				o.id === currentDesignatedId || o.code === currentDesignatedId,
		);

		const cleanCode = code.trim().toLowerCase();

		// If no office has been designated yet, verify against any live registered office
		if (!targetOfficeObj) {
			const matchingAny = officesList.find(
				(o: any) =>
					o.id.toLowerCase() === cleanCode ||
					o.code.toLowerCase() === cleanCode,
			);
			if (!matchingAny) {
				const errorMsg = `Invalid QR Code "${code.toUpperCase()}". Office code not recognized in campus system.`;
				qrScanErrorAlert = errorMsg;
				toast.error("Unrecognized Office Code", {
					description: errorMsg,
				});
				return false;
			}
			qrScanErrorAlert = null;
			return true;
		}

		// Strictly validate against assigned destination office
		const matchesId = targetOfficeObj.id.toLowerCase() === cleanCode;
		const matchesCode = targetOfficeObj.code.toLowerCase() === cleanCode;

		if (!matchesId && !matchesCode) {
			const assignedName = `${targetOfficeObj.name} (${targetOfficeObj.code})`;
			const errorMsg = `QR Mismatch! Scanned code "${code.toUpperCase()}" does not match your assigned office: ${assignedName}. Check-in rejected.`;
			qrScanErrorAlert = errorMsg;
			toast.error("Incorrect Office QR Code", {
				description: `You scanned a QR code for a different office. Please scan the desk QR at ${assignedName}.`,
			});
			return false;
		}

		qrScanErrorAlert = null;
		return true;
	}

	function handleQrScannedCode(code: string) {
		if (!validateScannedOfficeCode(code)) {
			return;
		}
		stopQrScanner();
		isScannerModalOpen = false;
		toast.success("Office Desk Verified!", {
			description: `Desk code ${code.toUpperCase()} matches your assigned destination office.`,
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
		[9.895647770829878, 123.88369296680753],
	];
	const mainGateCoords = { lat: 9.894144489361919, lng: 123.88273758838274 };

	let selectedOffice = $derived(
		officesList.find((o) => o.id === selectedOfficeId),
	);
	let selectedBuildingOffices = $derived(
		selectedBuildingForModal
			? officesList.filter(
					(o) => o.buildingId === selectedBuildingForModal.id,
				)
			: [],
	);

	let selectedBuildingRooms = $derived(
		selectedBuildingForModal
			? roomsList.filter(
					(r) => r.buildingId === selectedBuildingForModal.id,
				)
			: [],
	);

	// Categorized Search Results (Buildings, Offices, Rooms)
	let searchResults = $derived.by(() => {
		const q = searchQuery.toLowerCase().trim();
		if (!q) return { buildings: [], offices: [], rooms: [] };

		const matchingBuildings = buildingsList.filter(
			(b) =>
				b.name.toLowerCase().includes(q) ||
				b.code.toLowerCase().includes(q),
		);

		const matchingOffices = officesList.filter(
			(o) =>
				o.name.toLowerCase().includes(q) ||
				o.code.toLowerCase().includes(q) ||
				(o.description && o.description.toLowerCase().includes(q)),
		);

		const matchingRooms = roomsList.filter(
			(r) =>
				r.roomName.toLowerCase().includes(q) ||
				r.roomNumber.toLowerCase().includes(q) ||
				(r.description && r.description.toLowerCase().includes(q)),
		);

		return {
			buildings: matchingBuildings,
			offices: matchingOffices,
			rooms: matchingRooms,
		};
	});

	function focusSearchResult(
		item: any,
		type: "building" | "office" | "room",
	) {
		let targetBuilding: any = null;

		if (type === "building") {
			targetBuilding = item;
		} else if (type === "office") {
			targetBuilding = buildingsList.find(
				(b) => b.id === item.buildingId,
			);
			if (!targetBuilding && item.buildingName) {
				targetBuilding = buildingsList.find(
					(b) => b.name === item.buildingName,
				);
			}
			if (!targetBuilding && buildingsList.length > 0) {
				targetBuilding = buildingsList[0];
			}
		} else if (type === "room") {
			targetBuilding = buildingsList.find(
				(b) => b.id === item.buildingId,
			);
		}

		if (
			targetBuilding &&
			targetBuilding.xCoord &&
			targetBuilding.yCoord &&
			leafMap
		) {
			leafMap.flyTo([targetBuilding.xCoord, targetBuilding.yCoord], 20, {
				duration: 1.2,
			});
			selectedBuildingForModal = targetBuilding;
			isBuildingModalOpen = true;
			isSearchOpen = false;
			searchQuery = "";

			if (type === "office") {
				toast.info(`Navigating to ${item.name}`, {
					description: `Located inside ${targetBuilding.name}`,
				});
			} else if (type === "room") {
				toast.info(
					`Navigating to ${item.roomName} (${item.roomNumber})`,
					{
						description: `Located inside ${targetBuilding.name}`,
					},
				);
			} else {
				toast.info(`Navigating to ${targetBuilding.name}`);
			}
		} else if (targetBuilding) {
			selectedBuildingForModal = targetBuilding;
			isBuildingModalOpen = true;
			isSearchOpen = false;
			searchQuery = "";
		} else {
			toast.error("Location coordinates not configured for this item.");
		}
	}

	onMount(async () => {
		if (typeof window === "undefined") return;

		// 1. Check for saved visitor profile in localStorage (Cookie Auto-Fill)
		const savedProfile = localStorage.getItem("calapexis_visitor_profile");
		if (savedProfile) {
			try {
				const p = JSON.parse(savedProfile);
				firstName = p.firstName || "";
				middleName = p.middleName || "";
				lastName = p.lastName || "";
				email = p.email || "";
				phone = p.phone || "";
				photoUrl = p.photoUrl || "";
				isReturningVisitor = true;
				registrationStep = 3; // Fast-track returning visitor directly to Step 3
			} catch (e) {
				console.warn("Failed to parse saved visitor profile:", e);
			}
		}

		// 2. Check for cached active pass in localStorage
		const cachedPass = localStorage.getItem("calapexis_active_pass");
		if (cachedPass) {
			try {
				activeOfficialPass = JSON.parse(cachedPass);
				isGateOverlayOpen = false;
				if (activeOfficialPass?.id) {
					verifyActivePassStatus();
					setupVisitorRealtimeSubscription(activeOfficialPass.id);
				}
			} catch (e) {
				console.warn("Failed to parse cached active pass:", e);
			}
		}

		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", handleVisibilityOrFocus);
			window.addEventListener("focus", handleVisibilityOrFocus);
		}

		// 3. Check URL parameter to skip gate setup wizard and land directly on map / target building
		const buildingParam = page.url.searchParams.get("building");
		const officeParam = page.url.searchParams.get("office");
		const roomParam = page.url.searchParams.get("room");
		const targetParam = page.url.searchParams.get("target");
		const skipSetup =
			page.url.searchParams.get("skipSetup") === "true" ||
			page.url.searchParams.get("mode") === "map" ||
			page.url.searchParams.get("view") === "map" ||
			Boolean(buildingParam || officeParam || roomParam || targetParam);

		if (skipSetup) {
			isGateOverlayOpen = false;
		}

		// 3. Initialize Leaflet Map
		let L = (window as any).L;
		if (!L) {
			try {
				const leafletModule = await import("leaflet");
				L = leafletModule.default || leafletModule;
			} catch (e) {
				console.error("Failed to load Leaflet module:", e);
			}
		}

		if (!L || !mapContainer) return;
		leafletInstance = L;

		// 4. Create custom map panes
		const bounds: [number, number][] = campusBoundsCoords as any;

		const map = L.map(mapContainer, {
			center: [9.894414, 123.88258],
			zoom: 19,
			minZoom: 17,
			maxZoom: 22,
			maxBounds: bounds,
			maxBoundsViscosity: 0.8,
			zoomControl: false,
		});

		osmLayerInstance = L.tileLayer(
			"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
			{
				attribution: "OpenStreetMap",
				maxNativeZoom: 19,
				maxZoom: 22,
			},
		).addTo(map);

		satelliteLayerInstance = L.tileLayer(
			"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
			{
				attribution: "Esri",
				maxNativeZoom: 18,
				maxZoom: 22,
			},
		);

		campusOverlayInstance = L.imageOverlay(
			"/campusMap-adjusted.png",
			L.latLngBounds(bounds),
			{
				opacity: 1.0,
				interactive: false,
				zIndex: 300,
			},
		).addTo(map);

		// Create dedicated high-priority route pane for polylines above image overlays
		if (!map.getPane("routePane")) {
			const routePane = map.createPane("routePane");
			routePane.style.zIndex = "650";
			routePane.style.pointerEvents = "none";
		}

		// Create dedicated user marker pane above polylines
		if (!map.getPane("userMarkerPane")) {
			const markerPane = map.createPane("userMarkerPane");
			markerPane.style.zIndex = "700";
			markerPane.style.pointerEvents = "auto";
		}

		leafMap = map;

		// 4. Plot Interactive Building Nodes on Map
		plotBuildingNodesOnMap();

		// Handle direct URL parameter targeting (building, office, room)
		if (buildingParam || officeParam || roomParam || targetParam) {
			const targetId =
				buildingParam || officeParam || roomParam || targetParam || "";
			let targetBuilding: any = buildingsList.find(
				(b: any) =>
					b.id === targetId ||
					b.code.toLowerCase() === targetId.toLowerCase(),
			);

			if (!targetBuilding && officeParam) {
				const off = officesList.find(
					(o: any) =>
						o.id === officeParam ||
						o.code.toLowerCase() === officeParam.toLowerCase(),
				);
				if (off) {
					selectedOfficeId = off.id;
					targetBuilding = buildingsList.find(
						(b: any) =>
							b.id === off.buildingId ||
							b.name === off.buildingName,
					);
				}
			}

			if (!targetBuilding && roomParam) {
				const rm = roomsList.find(
					(r: any) =>
						r.id === roomParam ||
						r.roomNumber.toLowerCase() === roomParam.toLowerCase(),
				);
				if (rm) {
					targetBuilding = buildingsList.find(
						(b: any) => b.id === rm.buildingId,
					);
				}
			}

			if (targetBuilding) {
				selectedBuildingForModal = targetBuilding;
				isBuildingModalOpen = true;
				const coords = getBuildingLatLng(targetBuilding);
				leafMap.flyTo(coords, 20, { duration: 1.2 });
			}
		}

		// Initial plot of visitor marker at Main Gate or checked-in office location
		if (activeOfficialPass) {
			moveVisitorToOfficeLocation(activeOfficialPass);
		} else if (prePassData) {
			moveVisitorToOfficeLocation(prePassData);
		} else {
			updateVisitorMarkerOnMap(
				mainGateCoords.lat,
				mainGateCoords.lng,
				"Visitor (Main Gate)",
			);
		}

		// 5. Request Device GPS Position
		requestDeviceGps();

		setTimeout(() => map.invalidateSize(), 250);
	});

	onDestroy(() => {
		stopSelfieCamera();
		if (typeof document !== "undefined") {
			document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
			window.removeEventListener("focus", handleVisibilityOrFocus);
		}
		if (visitorRealtimeChannel && isSupabaseConfigured && supabase) {
			try {
				const dbClient = getDbClient();
				dbClient.removeChannel(visitorRealtimeChannel);
			} catch (e) {}
			visitorRealtimeChannel = null;
		}
	});

	// Dynamic Tile Layer & Campus Overlay Effect
	$effect(() => {
		if (!leafMap || !leafletInstance) return;

		if (activeTileLayer === "osm") {
			if (
				satelliteLayerInstance &&
				leafMap.hasLayer(satelliteLayerInstance)
			) {
				leafMap.removeLayer(satelliteLayerInstance);
			}
			if (osmLayerInstance && !leafMap.hasLayer(osmLayerInstance)) {
				osmLayerInstance.addTo(leafMap);
			}
		} else {
			if (osmLayerInstance && leafMap.hasLayer(osmLayerInstance)) {
				leafMap.removeLayer(osmLayerInstance);
			}
			if (
				satelliteLayerInstance &&
				!leafMap.hasLayer(satelliteLayerInstance)
			) {
				satelliteLayerInstance.addTo(leafMap);
			}
		}

		if (campusOverlayInstance) {
			if (showCampusOverlay) {
				if (!leafMap.hasLayer(campusOverlayInstance))
					campusOverlayInstance.addTo(leafMap);
			} else {
				if (leafMap.hasLayer(campusOverlayInstance))
					leafMap.removeLayer(campusOverlayInstance);
			}
		}
	});

	function getBuildingLatLng(b: any): [number, number] {
		// 1. Prioritize explicit latitude and longitude columns from database
		if (
			typeof b.lat === "number" &&
			typeof b.lng === "number" &&
			b.lat !== 0 &&
			b.lng !== 0
		) {
			return [b.lat, b.lng];
		}
		// 2. Check if xCoord / yCoord contain lat/lng values
		if (
			typeof b.xCoord === "number" &&
			typeof b.yCoord === "number" &&
			b.xCoord > 0 &&
			b.yCoord > 0
		) {
			const latVal = b.xCoord < 50 ? b.xCoord : b.yCoord;
			const lngVal = b.xCoord > 50 ? b.xCoord : b.yCoord;
			if (
				latVal >= 9.0 &&
				latVal <= 10.5 &&
				lngVal >= 123.0 &&
				lngVal <= 124.5
			) {
				return [latVal, lngVal];
			}
		}
		// 3. Fallback coordinates for default mock campus buildings
		const defaultCoords: Record<string, [number, number]> = {
			"off-1": [9.894414, 123.88258],
			"off-2": [9.89472, 123.88235],
			"off-3": [9.89421, 123.88204],
			"off-4": [9.89485, 123.88312],
			"off-5": [9.89512, 123.88225],
		};
		return defaultCoords[b.id] || [9.894414, 123.88258];
	}

	function plotBuildingNodesOnMap() {
		if (!leafMap || !leafletInstance) return;
		const L = leafletInstance;

		buildingMarkers.forEach((m) => leafMap.removeLayer(m));
		buildingMarkers = [];

		buildingsList.forEach((b: any) => {
			const coords = getBuildingLatLng(b);
			const color = b.color || "#3b82f6";

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
					iconAnchor: [50, 16],
				}),
			}).addTo(leafMap);

			marker.on("click", () => {
				selectedBuildingForModal = b;
				isBuildingImageLoading = true;
				isBuildingModalOpen = true;
				leafMap.setView(coords, 20, { animate: false });
			});

			buildingMarkers.push(marker);
		});
	}

	function getHeadingText(deg: number): string {
		const directions = [
			"North",
			"North-East",
			"East",
			"South-East",
			"South",
			"South-West",
			"West",
			"North-West",
		];
		const index = Math.round(deg / 45) % 8;
		return `${directions[index]} (${deg}°)`;
	}

	function setupDeviceOrientationListener() {
		if (typeof window === "undefined") return;

		const handleOrientation = (e: DeviceOrientationEvent) => {
			let heading = 0;
			if ((e as any).webkitCompassHeading !== undefined) {
				heading = (e as any).webkitCompassHeading;
			} else if (e.alpha !== null) {
				heading = 360 - e.alpha;
			}
			deviceHeading = Math.round((heading + 360) % 360);
			isCompassActive = true;

			const lat = userGps?.lat || mainGateCoords.lat;
			const lng = userGps?.lng || mainGateCoords.lng;
			updateVisitorMarkerWithHeading(lat, lng, deviceHeading);
		};

		if (window.DeviceOrientationEvent) {
			if (
				typeof (DeviceOrientationEvent as any).requestPermission ===
				"function"
			) {
				(DeviceOrientationEvent as any)
					.requestPermission()
					.then((state: string) => {
						if (state === "granted") {
							window.addEventListener(
								"deviceorientation",
								handleOrientation,
								true,
							);
						}
					})
					.catch(console.warn);
			} else {
				window.addEventListener(
					"deviceorientation",
					handleOrientation,
					true,
				);
			}
		}
	}

	function updateVisitorMarkerWithHeading(
		lat: number,
		lng: number,
		heading: number,
	) {
		if (!leafMap || !leafletInstance) return;
		const L = leafletInstance;

		const iconHtml = `
			<div class="relative flex items-center justify-center pointer-events-none">
				<!-- Directional Vision Cone -->
				<div class="absolute -top-7 size-16 pointer-events-none flex items-center justify-center transition-transform duration-200" style="transform: rotate(${heading}deg);">
					<div class="w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-b-[36px] border-b-primary/40 blur-[1px]"></div>
				</div>
				<!-- Visitor Location Pin -->
				<div class="relative size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl border-2 border-white animate-pulse z-10">
					<span class="text-[9px] font-black leading-none">YOU</span>
				</div>
			</div>
		`;

		const customIcon = L.divIcon({
			className: "bg-transparent border-none",
			html: iconHtml,
			iconSize: [40, 40],
			iconAnchor: [20, 20],
		});

		const markerPaneExists = leafMap.getPane("userMarkerPane");

		if (visitorMarker) {
			visitorMarker.setLatLng([lat, lng]);
			visitorMarker.setIcon(customIcon);
		} else {
			visitorMarker = L.marker([lat, lng], {
				icon: customIcon,
				zIndexOffset: 1000,
				...(markerPaneExists ? { pane: "userMarkerPane" } : {}),
			}).addTo(leafMap);
		}
	}

	function requestDeviceGps() {
		if (typeof window === "undefined" || !navigator.geolocation) return;
		gpsStatus = "locating";

		setupDeviceOrientationListener();

		const handleGpsUpdate = (pos: GeolocationPosition) => {
			const lat = pos.coords.latitude;
			const lng = pos.coords.longitude;
			const isInsideCampus =
				lat >= 9.8934 &&
				lat <= 9.8956 &&
				lng >= 123.8815 &&
				lng <= 123.8836;

			if (isInsideCampus) {
				userGps = { lat, lng };
				gpsStatus = "active";

				if (isCompassActive) {
					updateVisitorMarkerWithHeading(lat, lng, deviceHeading);
				} else {
					updateVisitorMarkerOnMap(lat, lng, "Live GPS Position");
				}

				const targetOffId =
					selectedOfficeId ||
					activeOfficialPass?.officeId ||
					prePassData?.officeId;
				if (targetOffId) {
					calculatePathfindingRoutes(lat, lng, targetOffId);
				}

				const targetLogId =
					activeOfficialPass?.id || prePassData?.logId;
				if (targetLogId) {
					const body = new FormData();
					body.append("logId", targetLogId);
					body.append("lat", lat.toString());
					body.append("lng", lng.toString());
					fetch("?/updateLocation", { method: "POST", body }).catch(
						(e) => console.warn("GPS sync fail:", e),
					);
				}
			} else {
				gpsStatus = "disabled";

				// Auto Check-Out if visitor is checked-in and position moves outside campus bounds
				if (
					activeOfficialPass?.status === "checked_in" &&
					activeOfficialPass?.id
				) {
					const body = new FormData();
					body.append("logId", activeOfficialPass.id);
					fetch("?/checkOut", { method: "POST", body })
						.then(() => {
							activeOfficialPass = null;
							if (primaryPolyline && leafMap)
								leafMap.removeLayer(primaryPolyline);
							if (alternativePolyline && leafMap)
								leafMap.removeLayer(alternativePolyline);
							primaryPolyline = null;
							alternativePolyline = null;
							toast.info("Auto Check-Out Completed", {
								description:
									"You have been automatically checked out as your GPS position departed the campus boundaries.",
								duration: 8000,
							});
						})
						.catch((e) =>
							console.warn("GPS Auto check-out failed:", e),
						);
				}
			}
		};

		navigator.geolocation.getCurrentPosition(
			(pos) => {
				handleGpsUpdate(pos);
				toast.success("GPS Location active on campus.");
			},
			(err) => {
				console.warn("Geolocation access denied:", err.message);
				gpsStatus = "disabled";
			},
			{ enableHighAccuracy: true, timeout: 5000 },
		);

		navigator.geolocation.watchPosition(
			handleGpsUpdate,
			(err) => console.warn("GPS watch fail:", err.message),
			{ enableHighAccuracy: true },
		);
	}

	function updateVisitorMarkerOnMap(lat: number, lng: number, label: string) {
		if (!leafMap || !leafletInstance) return;
		const L = leafletInstance;

		if (isCompassActive) {
			updateVisitorMarkerWithHeading(lat, lng, deviceHeading);
			return;
		}

		const iconHtml = `
			<div class="group relative flex items-center justify-center">
				<span class="animate-ping absolute inline-flex size-8 rounded-full bg-primary/40"></span>
				<div class="relative flex size-8 items-center justify-center rounded-full bg-primary border-2 border-primary-foreground shadow-xl">
					<span class="text-[10px] font-black text-primary-foreground leading-none">YOU</span>
				</div>
			</div>
		`;

		const markerPaneExists = leafMap.getPane("userMarkerPane");

		if (visitorMarker) {
			visitorMarker.setLatLng([lat, lng]);
		} else {
			visitorMarker = L.marker([lat, lng], {
				icon: L.divIcon({
					className: "bg-transparent border-none",
					html: iconHtml,
					iconSize: [32, 32],
					iconAnchor: [16, 16],
				}),
				zIndexOffset: 1000,
				...(markerPaneExists ? { pane: "userMarkerPane" } : {}),
			})
				.bindPopup(
					`<div class="font-sans font-bold text-xs p-1">${label}</div>`,
				)
				.addTo(leafMap);
		}
	}

	function haversineDistance(
		lat1: number,
		lon1: number,
		lat2: number,
		lon2: number,
	): number {
		const R = 6371000;
		const dLat = (lat2 - lat1) * (Math.PI / 180);
		const dLon = (lon2 - lon1) * (Math.PI / 180);
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(lat1 * (Math.PI / 180)) *
				Math.cos(lat2 * (Math.PI / 180)) *
				Math.sin(dLon / 2) *
				Math.sin(dLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	}

	// Step-by-step turn directions state & drawer toggle
	let isDirectionsOpen = $state(false);
	let stepDirections = $state<
		{ fromName: string; toName: string; distanceMeters: number }[]
	>([]);
	let hasArrivedToastShown = $state(false);

	function getBuildingNameById(nodeId: string): string {
		const b = buildingsList.find(
			(b: any) => b.id === nodeId || b.code === nodeId,
		);
		return b ? `${b.name} (${b.code})` : nodeId;
	}

	function calculateEdgeWeights(rawEdges: any[]) {
		return rawEdges.map((ep: any) => {
			let weight = 0;
			const pts = Array.isArray(ep.path) ? ep.path : [];
			for (let i = 0; i < pts.length - 1; i++) {
				weight += haversineDistance(
					pts[i][0],
					pts[i][1],
					pts[i + 1][0],
					pts[i + 1][1],
				);
			}
			return {
				from: ep.fromNode || ep.from,
				to: ep.toNode || ep.to,
				path: pts,
				weight: Math.round(weight),
			};
		});
	}

	function buildAdjacencyList(edges: any[]) {
		const adjacencyList: Record<
			string,
			{ node: string; weight: number; path: [number, number][] }[]
		> = {};

		buildingsList.forEach((b: any) => {
			if (!adjacencyList[b.id]) adjacencyList[b.id] = [];
		});

		edges.forEach((edge: any) => {
			if (!adjacencyList[edge.from]) adjacencyList[edge.from] = [];
			if (!adjacencyList[edge.to]) adjacencyList[edge.to] = [];

			adjacencyList[edge.from].push({
				node: edge.to,
				weight: edge.weight,
				path: edge.path,
			});
			adjacencyList[edge.to].push({
				node: edge.from,
				weight: edge.weight,
				path: [...edge.path].reverse(),
			});
		});

		return adjacencyList;
	}

	function prototypeDijkstra(
		start: string,
		end: string,
		adjacencyList: Record<string, any[]>,
	) {
		const distances: Record<string, number> = {};
		const previous: Record<string, string | null> = {};
		const unvisited = new Set<string>();

		const allNodes = Object.keys(adjacencyList);
		if (allNodes.length === 0) return null;

		allNodes.forEach((id) => {
			distances[id] = Infinity;
			previous[id] = null;
			unvisited.add(id);
		});

		if (distances[start] === undefined) {
			distances[start] = Infinity;
			previous[start] = null;
			unvisited.add(start);
		}

		distances[start] = 0;

		while (unvisited.size > 0) {
			let current: string | null = null;
			let minDest = Infinity;
			for (const nodeId of unvisited) {
				if (distances[nodeId] < minDest) {
					minDest = distances[nodeId];
					current = nodeId;
				}
			}

			if (
				current === null ||
				distances[current] === Infinity ||
				current === end
			)
				break;
			unvisited.delete(current);

			const neighbors = adjacencyList[current] || [];
			neighbors.forEach((neighbor: any) => {
				if (unvisited.has(neighbor.node)) {
					const alt = distances[current!] + neighbor.weight;
					if (alt < distances[neighbor.node]) {
						distances[neighbor.node] = alt;
						previous[neighbor.node] = current;
					}
				}
			});
		}

		const nodePath: string[] = [];
		let curr: string | null = end;
		if (previous[curr] !== null || curr === start) {
			while (curr !== null) {
				nodePath.unshift(curr);
				curr = previous[curr];
			}
		}

		return nodePath.length > 0
			? { nodePath, distance: distances[end] }
			: null;
	}

	function calculatePathfindingRoutes(
		startLat: number,
		startLng: number,
		targetOfficeId: string,
	) {
		if (!leafMap || !leafletInstance) return;
		const L = leafletInstance;

		const selectedOff = officesList.find(
			(o: any) => o.id === targetOfficeId || o.code === targetOfficeId,
		);
		const targetBuilding = buildingsList.find(
			(b: any) => b.id === (selectedOff?.buildingId || targetOfficeId),
		);
		if (!targetBuilding) return;

		const processedEdges = calculateEdgeWeights(mapEdgesList);
		const adjList = buildAdjacencyList(processedEdges);

		// Find closest start building node to current coordinates
		let startNode = buildingsList[0]?.id || "start";
		let minStartDist = Infinity;

		buildingsList.forEach((b: any) => {
			const bCoords = getBuildingLatLng(b);
			const d = haversineDistance(
				startLat,
				startLng,
				bCoords[0],
				bCoords[1],
			);
			if (d < minStartDist) {
				minStartDist = d;
				startNode = b.id;
			}
		});

		const targetNode = targetBuilding.id;

		const result = prototypeDijkstra(startNode, targetNode, adjList);

		if (result && result.nodePath.length > 0) {
			const nodePath = result.nodePath;
			const fullPathLatLngs: [number, number][] = [];
			const steps: {
				fromName: string;
				toName: string;
				distanceMeters: number;
			}[] = [];

			for (let i = 0; i < nodePath.length - 1; i++) {
				const current = nodePath[i];
				const next = nodePath[i + 1];
				const edge = adjList[current]?.find(
					(e: any) => e.node === next,
				);
				if (edge) {
					const pointsToAdd =
						i === 0 ? edge.path : edge.path.slice(1);
					fullPathLatLngs.push(...pointsToAdd);
					steps.push({
						fromName: getBuildingNameById(current),
						toName: getBuildingNameById(next),
						distanceMeters: edge.weight,
					});
				}
			}

			if (
				fullPathLatLngs.length === 0 ||
				haversineDistance(
					fullPathLatLngs[0][0],
					fullPathLatLngs[0][1],
					startLat,
					startLng,
				) > 5
			) {
				fullPathLatLngs.unshift([startLat, startLng]);
			}

			primaryPathPoints = fullPathLatLngs;
			primaryDistanceMeters = result.distance;
			stepDirections = steps;
			alternativePathPoints = fullPathLatLngs;
			alternativeDistanceMeters = result.distance;

			// Check Arrival Geofence (< 15 meters)
			checkArrivalGeofence(
				result.distance,
				selectedOff?.name || targetBuilding.name,
			);
		} else {
			// Direct fallback vector if graph nodes are unconnected
			const targetCoords = getBuildingLatLng(targetBuilding);
			const directDist = Math.round(
				haversineDistance(
					startLat,
					startLng,
					targetCoords[0],
					targetCoords[1],
				),
			);
			primaryPathPoints = [[startLat, startLng], targetCoords];
			primaryDistanceMeters = directDist;
			alternativePathPoints = primaryPathPoints;
			alternativeDistanceMeters = directDist;
			stepDirections = [
				{
					fromName: "Current Position",
					toName: targetBuilding.name,
					distanceMeters: directDist,
				},
			];

			checkArrivalGeofence(
				directDist,
				selectedOff?.name || targetBuilding.name,
			);
		}

		renderCalculatedRoutesOnMap();
	}

	function checkArrivalGeofence(
		distanceMeters: number,
		destinationName: string,
	) {
		if (
			distanceMeters < 15 &&
			(selectedOfficeId || activeOfficialPass || prePassData) &&
			!hasArrivedToastShown
		) {
			hasArrivedToastShown = true;
			toast.success(`🎉 You have arrived at ${destinationName}!`, {
				description:
					"GPS Location verified at building desk. Digital Pass activated!",
			});

			// If visitor is currently in pre-pass preliminary state, auto-trigger checkIn form submit to update status in database
			// if (prePassData && !activeOfficialPass && checkInFormElement) {
			// 	const currentCode = (prePassData as any).officeCode || prePassData.officeId;
			// 	if (hiddenOfficeCodeInput) hiddenOfficeCodeInput.value = currentCode;
			// 	checkInFormElement.requestSubmit();
			// }
		} else if (distanceMeters >= 20) {
			hasArrivedToastShown = false;
		}
	}

	let isRouteCardActive = $state(true);
	let touchStartY = $state(0);
	let touchCurrentY = $state(0);

	// Expandable Image Lightbox Modal State
	let expandedImage = $state<{
		url: string;
		title: string;
		caption?: string;
	} | null>(null);
	let isLightboxOpen = $state(false);

	function openImageLightbox(url?: string, title?: string, caption?: string) {
		if (!url) return;
		expandedImage = { url, title: title || "Campus Image", caption };
		isLightboxOpen = true;
	}

	function handleTouchStart(e: TouchEvent) {
		touchStartY = e.touches[0].clientY;
	}

	function handleTouchMove(e: TouchEvent) {
		touchCurrentY = e.touches[0].clientY;
	}

	function handleTouchEnd() {
		if (touchCurrentY > touchStartY + 45) {
			closeNavigationRoute();
		}
		touchStartY = 0;
		touchCurrentY = 0;
	}

	let activeDestinationName = $derived.by(() => {
		if (selectedOfficeId) {
			const off = officesList.find(
				(o: any) =>
					o.id === selectedOfficeId || o.code === selectedOfficeId,
			);
			if (off) return off.name;
			const b = buildingsList.find(
				(b: any) =>
					b.id === selectedOfficeId || b.code === selectedOfficeId,
			);
			if (b) return `${b.name} (${b.code})`;
		}
		if (
			activeOfficialPass?.officeName &&
			activeOfficialPass.officeName !== "Designated Office"
		) {
			return activeOfficialPass.officeName;
		}
		if (
			prePassData?.officeName &&
			prePassData.officeName !== "Designated Office"
		) {
			return prePassData.officeName;
		}
		return "Designated Campus Office";
	});

	function closeNavigationRoute() {
		if (primaryPolyline && leafMap) {
			leafMap.removeLayer(primaryPolyline);
			primaryPolyline = null;
		}
		if (alternativePolyline && leafMap) {
			leafMap.removeLayer(alternativePolyline);
			alternativePolyline = null;
		}
		primaryPathPoints = [];
		alternativePathPoints = [];
		selectedOfficeId = "";
		isRouteCardActive = false;
		toast.info("Navigation route cleared.");
	}

	function startNavigationToBuilding(building: any) {
		if (!building) return;
		isBuildingModalOpen = false;
		selectedOfficeId = building.id;
		isRouteCardActive = true;

		const startLat = userGps?.lat || mainGateCoords.lat;
		const startLng = userGps?.lng || mainGateCoords.lng;

		calculatePathfindingRoutes(startLat, startLng, building.id);
		toast.success(`Navigating to ${building.name} (${building.code})`);
	}

	function renderCalculatedRoutesOnMap() {
		if (!leafMap || !leafletInstance) return;
		const L = leafletInstance;

		if (primaryPolyline) leafMap.removeLayer(primaryPolyline);
		if (alternativePolyline) leafMap.removeLayer(alternativePolyline);

		const activePoints =
			activeRouteMode === "primary"
				? primaryPathPoints
				: alternativePathPoints;
		const altPoints =
			activeRouteMode === "primary"
				? alternativePathPoints
				: primaryPathPoints;

		const routePaneExists = leafMap.getPane("routePane");

		// Render Alternative polyline (dashed purple) on high-priority routePane
		if (
			altPoints.length >= 2 &&
			activeRouteMode === "primary" &&
			alternativeDistanceMeters > primaryDistanceMeters
		) {
			alternativePolyline = L.polyline(altPoints, {
				color: "#8b5cf6",
				weight: 5,
				opacity: 0.7,
				dashArray: "8, 8",
				...(routePaneExists ? { pane: "routePane" } : {}),
			}).addTo(leafMap);
			alternativePolyline.bindTooltip("Alternative Route", {
				sticky: true,
			});
		}

		// Render Active Route polyline (solid emerald green) on high-priority routePane
		if (activePoints.length >= 2) {
			primaryPolyline = L.polyline(activePoints, {
				color: "#10b981",
				weight: 7,
				opacity: 0.95,
				...(routePaneExists ? { pane: "routePane" } : {}),
			}).addTo(leafMap);
			primaryPolyline.bindTooltip(
				`Active Route (${activeRouteDistance} m)`,
				{ sticky: true },
			);

			leafMap.fitBounds(L.polyline(activePoints).getBounds(), {
				padding: [50, 50],
			});
		}
	}

	function drawNavigationPathToOffice(office: Office) {
		isRouteCardActive = true;
		const startLat = userGps?.lat || mainGateCoords.lat;
		const startLng = userGps?.lng || mainGateCoords.lng;
		calculatePathfindingRoutes(startLat, startLng, office.id);
	}

	// Helper to safely write to localStorage without throwing QuotaExceededError
	function safeSetLocalStorage(key: string, value: any) {
		try {
			const serialized =
				typeof value === "string" ? value : JSON.stringify(value);
			localStorage.setItem(key, serialized);
		} catch (e) {
			console.warn(
				`LocalStorage quota exceeded for ${key}, attempting fallback:`,
				e,
			);
			if (typeof value === "object" && value !== null) {
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
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { facingMode: "user" },
				audio: false,
			});
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
			stream.getTracks().forEach((track) => track.stop());
			videoElement.srcObject = null;
		}
		isCameraActive = false;
	}

	function captureSelfieSnapshot() {
		if (!videoElement || !canvasElement) return;
		const context = canvasElement.getContext("2d");
		if (context) {
			canvasElement.width = 250;
			canvasElement.height = 250;
			context.drawImage(videoElement, 0, 0, 250, 250);
			photoUrl = canvasElement.toDataURL("image/jpeg", 0.6);
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
					const tempCanvas = document.createElement("canvas");
					tempCanvas.width = 250;
					tempCanvas.height = 250;
					const ctx = tempCanvas.getContext("2d");
					if (ctx) {
						ctx.drawImage(img, 0, 0, 250, 250);
						photoUrl = tempCanvas.toDataURL("image/jpeg", 0.6);
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
			localStorage.removeItem("calapexis_visitor_profile");
		} catch (e) {}
		firstName = "";
		middleName = "";
		lastName = "";
		email = "";
		phone = "";
		photoUrl = "";
		isReturningVisitor = false;
		toast.info("Saved profile cleared.");
	}

	function resetVisitorProfile() {
		try {
			localStorage.removeItem("calapexis_visitor_profile");
			localStorage.removeItem("calapexis_active_pass");
		} catch (e) {}
		firstName = "";
		middleName = "";
		lastName = "";
		email = "";
		phone = "";
		photoUrl = "";
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
				toast.error(
					"Please capture a selfie snapshot or upload an image file before proceeding.",
				);
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
			if (result.type === "success" && result.data?.prePassData) {
				const data = result.data.prePassData;
				prePassData = data;
				safeSetLocalStorage("calapexis_visitor_profile", {
					firstName: data.firstName,
					middleName: data.middleName,
					lastName: data.lastName,
					email: data.email,
					phone: data.phone,
					photoUrl: data.photoUrl,
				});

				if (data.logId) {
					setupVisitorRealtimeSubscription(data.logId);
				}

				isGateOverlayOpen = false;
				registrationStep = 1;

				const targetOffice = officesList.find(
					(o) => o.id === data.officeId,
				);
				if (targetOffice) {
					drawNavigationPathToOffice(targetOffice);
				}

				toast.success("Check-In Registered!", {
					description: `Pre-Pass created for ${data.officeName}. Map unlocked!`,
				});
			} else if (result.type === "failure") {
				toast.error(result.data?.message || "Registration failed.");
			}
		};
	}

	function moveVisitorToOfficeLocation(passOrPrePass: any) {
		if (!passOrPrePass) return;
		const targetOffice = officesList.find(
			(o) =>
				o.id === passOrPrePass.officeId ||
				o.name === passOrPrePass.officeName ||
				o.code === passOrPrePass.officeCode,
		);

		let targetBuilding: any = null;
		if (targetOffice) {
			targetBuilding =
				buildingsList.find((b) => b.id === targetOffice.buildingId) ||
				buildingsList.find((b) => b.name === targetOffice.buildingName);
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
				`${passOrPrePass.fullName || "Checked-In Visitor"} @ ${targetOffice?.name || targetBuilding.name}`,
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
					body: bodyData,
				}).catch((err) =>
					console.warn("Database location sync error:", err),
				);
			}
		}
	}

	function handleCheckInEnhance() {
		isSubmittingCheckIn = true;
		return async ({ result }: { result: any }) => {
			isSubmittingCheckIn = false;
			if (result.type === "success" && result.data?.activeOfficialPass) {
				const pass = result.data.activeOfficialPass;
				activeOfficialPass = pass;
				safeSetLocalStorage("calapexis_active_pass", pass);
				isScannerModalOpen = false;

				if (pass.id) {
					setupVisitorRealtimeSubscription(pass.id);
				}

				moveVisitorToOfficeLocation(pass);

				toast.success("Check-In Complete!", {
					description: `Digital Pass ${pass.passCode} logged in database.`,
				});
			} else if (result.type === "failure") {
				toast.error(result.data?.message || "Check-In failed.");
			}
		};
	}

	function openGateOverlay() {
		const savedProfile = localStorage.getItem("calapexis_visitor_profile");
		if (savedProfile) {
			try {
				const p = JSON.parse(savedProfile);
				firstName = p.firstName || "";
				middleName = p.middleName || "";
				lastName = p.lastName || "";
				email = p.email || "";
				phone = p.phone || "";
				photoUrl = p.photoUrl || "";
				isReturningVisitor = true;
				registrationStep = 3;
			} catch (e) {
				console.warn("Failed to parse saved profile:", e);
			}
		} else {
			firstName = "";
			middleName = "";
			lastName = "";
			email = "";
			phone = "";
			photoUrl = "";
			isReturningVisitor = false;
			registrationStep = 1;
		}
		isGateOverlayOpen = true;
	}

	function handleSelfCheckout() {
		if (activeOfficialPass || prePassData) {
			const targetId = activeOfficialPass?.id || prePassData?.logId;
			if (targetId) checkoutLocalVisitor(targetId);
			handleExternalCheckout("manual");
			toast.info("Checked out of campus. Re-opened Campus Gate screen.");
		} else {
			openGateOverlay();
		}
	}

	function focusOfficeOnMap(office: Office) {
		if (leafMap) {
			leafMap.setView([9.894414, 123.88258], 20, { animate: false });
			toast.info(`Camera focused on ${office.name}.`);
		}
	}
</script>

<div
	class="relative w-full h-screen overflow-hidden bg-background text-foreground font-sans select-none"
>
	<!-- 1. FULLSCREEN CAMPUS GATE SETUP OVERLAY (INITIAL SETUP WIZARD) -->
	{#if isGateOverlayOpen}
		<div
			class="fixed inset-0 z-[2000] bg-background/95 backdrop-blur-3xl flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto"
		>
			<div
				class="relative max-w-md w-full bg-card border border-border rounded-3xl p-6 shadow-2xl flex flex-col gap-5"
			>
				<!-- Gate Header & Logo -->
				<div class="text-center pt-2">
					<div
						class="size-16 bg-primary/10 border border-primary/20 text-primary rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-md"
					>
						<span class="font-black text-2xl">C</span>
					</div>
					<h2
						class="text-xl font-black text-foreground tracking-tight"
					>
						BISU Calape Gate Check-In
					</h2>
					<p class="text-xs text-muted-foreground mt-0.5">
						Please register your details to unlock campus map & pass
					</p>
				</div>

				<!-- WIZARD STEP PROGRESS BAR -->
				<div class="flex items-center justify-between gap-2 px-1">
					<div
						class="flex-1 h-1.5 rounded-full {registrationStep >= 1
							? 'bg-primary'
							: 'bg-muted'} transition-colors"
					></div>
					<div
						class="flex-1 h-1.5 rounded-full {registrationStep >= 2
							? 'bg-primary'
							: 'bg-muted'} transition-colors"
					></div>
					<div
						class="flex-1 h-1.5 rounded-full {registrationStep >= 3
							? 'bg-primary'
							: 'bg-muted'} transition-colors"
					></div>
				</div>

				<!-- Step Header Title -->
				<div
					class="flex items-center gap-2 border-b border-border/60 pb-2"
				>
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
				<form
					action="?/register"
					method="POST"
					use:enhance={handleRegisterEnhance}
					class="flex flex-col gap-4 font-semibold text-xs"
				>
					<input type="hidden" name="firstName" value={firstName} />
					<input type="hidden" name="middleName" value={middleName} />
					<input type="hidden" name="lastName" value={lastName} />
					<input type="hidden" name="email" value={email} />
					<input type="hidden" name="phone" value={phone} />
					<input type="hidden" name="photoUrl" value={photoUrl} />
					<input
						type="hidden"
						name="officeId"
						value={selectedOfficeId}
					/>
					<input type="hidden" name="purpose" value={purpose} />
					<input
						type="hidden"
						name="lat"
						value={userGps?.lat || ""}
					/>
					<input
						type="hidden"
						name="lng"
						value={userGps?.lng || ""}
					/>

					{#if registrationStep === 1}
						<!-- STEP 1: PERSONAL DETAILS -->
						{#if isGooglePreFilled}
							<div
								class="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs font-semibold"
							>
								<div class="flex items-center gap-2">
									<SparklesIcon
										class="size-4 text-emerald-500"
									/>
									<span class="font-bold text-foreground"
										>Google Account Details Auto-Filled</span
									>
								</div>
								<Badge
									variant="outline"
									class="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
									>Google Verified</Badge
								>
							</div>
						{:else if isReturningVisitor}
							<div
								class="p-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs font-semibold"
							>
								<div class="flex items-center gap-2">
									<SparklesIcon class="size-4 text-primary" />
									<span class="font-bold text-foreground"
										>Saved Profile Auto-Filled</span
									>
								</div>
								<button
									type="button"
									onclick={clearSavedProfile}
									class="text-[10px] text-primary font-black uppercase hover:underline cursor-pointer"
									>Clear</button
								>
							</div>
						{:else}
							<Button
								type="button"
								variant="outline"
								onclick={handleVisitorGoogleSignIn}
								class="w-full h-10 rounded-xl border-border bg-card hover:bg-muted/50 font-extrabold text-xs flex items-center justify-center gap-2.5 shadow-xs transition-all cursor-pointer mb-1"
							>
								<svg
									class="h-4 w-4 shrink-0"
									viewBox="0 0 24 24"
									xmlns="http://www.w3.org/2000/svg"
								>
									<path
										fill="#4285F4"
										d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
									/>
									<path
										fill="#34A853"
										d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
									/>
									<path
										fill="#FBBC05"
										d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"
									/>
									<path
										fill="#EA4335"
										d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
									/>
								</svg>
								<span>Fill-Up via Google</span>
							</Button>
							<Field.FieldSeparator
								class="text-[10px] text-muted-foreground font-bold mb-1"
								>or enter details manually</Field.FieldSeparator
							>
						{/if}

						<Field.FieldGroup class="flex flex-col gap-3">
							<div class="grid grid-cols-3 gap-2">
								<Field.Field>
									<Field.FieldLabel for="gate-firstName"
										>First Name *</Field.FieldLabel
									>
									<Input
										id="gate-firstName"
										bind:value={firstName}
										placeholder="Juan"
										required
										class="rounded-xl h-9 text-xs"
									/>
								</Field.Field>
								<Field.Field>
									<Field.FieldLabel for="gate-middleName"
										>Middle</Field.FieldLabel
									>
									<Input
										id="gate-middleName"
										bind:value={middleName}
										placeholder="de la"
										class="rounded-xl h-9 text-xs"
									/>
								</Field.Field>
								<Field.Field>
									<Field.FieldLabel for="gate-lastName"
										>Last Name *</Field.FieldLabel
									>
									<Input
										id="gate-lastName"
										bind:value={lastName}
										placeholder="Cruz"
										required
										class="rounded-xl h-9 text-xs"
									/>
								</Field.Field>
							</div>

							<div class="grid grid-cols-2 gap-2">
								<Field.Field>
									<Field.FieldLabel for="gate-email"
										>Email (Optional)</Field.FieldLabel
									>
									<Input
										id="gate-email"
										type="email"
										bind:value={email}
										placeholder="juan@gmail.com"
										class="rounded-xl h-9 text-xs"
									/>
								</Field.Field>
								<Field.Field>
									<Field.FieldLabel for="gate-phone"
										>Phone (Optional)</Field.FieldLabel
									>
									<Input
										id="gate-phone"
										type="tel"
										bind:value={phone}
										placeholder="+63 917..."
										class="rounded-xl h-9 text-xs"
									/>
								</Field.Field>
							</div>
						</Field.FieldGroup>

						<div class="pt-2 flex flex-col gap-2">
							<Button
								type="button"
								onclick={goToNextStep}
								class="w-full bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-11 gap-1.5 cursor-pointer shadow-md"
							>
								<span>Next: Photo Snapshot</span>
								<ArrowRightIcon data-icon="inline-end" />
							</Button>
							<Button
								type="button"
								onclick={() => (isGateOverlayOpen = false)}
								variant="ghost"
								class="w-full text-xs font-bold text-muted-foreground rounded-xl h-9 cursor-pointer"
							>
								<span>Bypass & Open Map</span>
							</Button>
						</div>
					{:else if registrationStep === 2}
						<!-- STEP 2: PHOTO SNAPSHOT OR UPLOAD (REQUIRED) -->
						<div class="flex flex-col gap-3">
							<div
								class="flex flex-col gap-3 items-center p-5 rounded-2xl border border-border bg-card shadow-xs text-center"
							>
								{#if photoUrl}
									<img
										src={photoUrl}
										alt="Selfie Preview"
										class="size-28 rounded-full object-cover border-4 border-primary/30 shadow-lg"
									/>
									<span
										class="text-[11px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider"
										>Photo Captured & Optimized!</span
									>
									<Button
										type="button"
										onclick={startSelfieCamera}
										variant="outline"
										class="text-xs font-bold rounded-xl h-9 gap-1.5 mt-1 cursor-pointer"
									>
										<RefreshCwIcon
											class="size-3.5 pointer-events-none"
										/>
										<span>Retake Photo</span>
									</Button>
								{:else if isCameraActive}
									<div
										class="relative size-48 rounded-2xl overflow-hidden bg-black border border-primary/40 shadow-inner"
									>
										<video
											bind:this={videoElement}
											autoplay
											playsinline
											class="size-full object-cover"
										></video>
									</div>
									<canvas
										bind:this={canvasElement}
										class="hidden"
									></canvas>
									<Button
										type="button"
										onclick={captureSelfieSnapshot}
										class="bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-10 gap-1.5 cursor-pointer mt-2 w-full max-w-xs shadow-md"
									>
										<CameraIcon class="size-4 pointer-events-none" />
										<span>Capture Snapshot</span>
									</Button>
								{:else}
									<div
										class="size-20 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-center text-muted-foreground shadow-inner"
									>
										<CameraIcon class="size-8 text-primary/80" />
									</div>
									<div class="space-y-1">
										<h4 class="text-xs font-black text-foreground">Visitor Photo Identification</h4>
										<p class="text-[11px] text-muted-foreground font-medium">Take a photo via selfie camera or upload an ID image.</p>
									</div>
									<div
										class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 w-full"
									>
										<Button
											type="button"
											onclick={startSelfieCamera}
											variant="default"
											class="w-full h-11 rounded-xl font-bold text-xs gap-2 cursor-pointer shadow-sm"
										>
											<CameraIcon
												class="size-4 pointer-events-none"
											/>
											<span>Selfie Camera</span>
										</Button>

										<input
											type="file"
											accept="image/*"
											bind:this={fileInputElement}
											onchange={handleFileUpload}
											class="hidden"
										/>
										<Button
											type="button"
											variant="outline"
											onclick={() => fileInputElement?.click()}
											class="w-full h-11 rounded-xl font-bold text-xs gap-2 border-border bg-card hover:bg-muted/60 cursor-pointer shadow-xs"
										>
											<UploadIcon
												class="size-4 text-primary pointer-events-none"
											/>
											<span>Upload File</span>
										</Button>
									</div>
								{/if}
							</div>
						</div>

						<div class="pt-2 flex gap-2">
							<Button
								type="button"
								onclick={goToPrevStep}
								variant="outline"
								class="flex-1 text-xs font-semibold rounded-xl h-11 gap-1.5 cursor-pointer"
							>
								<ArrowLeftIcon class="size-4 pointer-events-none" />
								<span>Back</span>
							</Button>
							<Button
								type="button"
								onclick={goToNextStep}
								class="flex-1 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-11 gap-1.5 cursor-pointer shadow-md"
							>
								<span>Next: Office Step</span>
								<ArrowRightIcon class="size-4 pointer-events-none" />
							</Button>
						</div>
					{:else if registrationStep === 3}
						<!-- STEP 3: DESTINATION OFFICE & PURPOSE -->
						{#if isReturningVisitor}
							<div
								class="p-3 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs font-semibold mb-1"
							>
								<div class="flex items-center gap-2">
									<SparklesIcon
										class="size-4 text-primary shrink-0"
									/>
									<div class="text-start">
										<span
											class="font-black text-foreground block"
											>Welcome back, {firstName}!</span
										>
										<span
											class="text-[10px] text-muted-foreground font-normal"
											>Using your saved visitor profile.</span
										>
									</div>
								</div>
								<button
									type="button"
									onclick={resetVisitorProfile}
									class="text-[10px] text-primary font-black uppercase hover:underline cursor-pointer"
									>Not You?</button
								>
							</div>
						{/if}

						<Field.FieldGroup class="flex flex-col gap-3">
							<Field.Field>
								<Field.FieldLabel for="gate-office"
									>Designated Office / Desk *</Field.FieldLabel
								>
								<Button
									variant="outline"
									type="button"
									onclick={() => {
										officeSearchQuery = "";
										isOfficeDialogOpen = true;
									}}
									class="w-full justify-between rounded-xl h-11 text-xs font-bold border-border bg-background cursor-pointer px-3.5 hover:bg-muted/40 transition-all shadow-2xs"
								>
									<div class="flex items-center gap-2 truncate">
										<Building2Icon class="size-4 text-primary shrink-0 pointer-events-none" />
										<span class="truncate">
											{selectedOffice
												? `${selectedOffice.name} (${selectedOffice.code})`
												: "-- Select Destination Office --"}
										</span>
									</div>
									<ChevronsUpDownIcon
										class="size-4 opacity-50 ml-2 shrink-0 pointer-events-none"
									/>
								</Button>
							</Field.Field>

							<Field.Field>
								<Field.FieldLabel for="gate-purpose"
									>Purpose of Visit *</Field.FieldLabel
								>
								<input
									type="hidden"
									name="purpose"
									value={purpose}
								/>
								<Button
									variant="outline"
									type="button"
									onclick={() => {
										purposeSearchInput = "";
										isPurposeDialogOpen = true;
									}}
									class="w-full justify-between rounded-xl h-11 text-xs font-semibold border-border bg-background cursor-pointer px-3.5 hover:bg-muted/40 transition-all shadow-2xs"
								>
									<div class="flex items-center gap-2 truncate">
										<SchoolIcon class="size-4 text-primary shrink-0 pointer-events-none" />
										<span class="truncate">
											{purpose
												? purpose
												: "-- Select or Type Visit Purpose --"}
										</span>
									</div>
									<ChevronsUpDownIcon
										class="size-4 opacity-50 ml-2 shrink-0 pointer-events-none"
									/>
								</Button>
							</Field.Field>
						</Field.FieldGroup>

						<!-- Office Selection Dialog Modal (Mobile Friendly) -->
						<Dialog.Root bind:open={isOfficeDialogOpen}>
							<Dialog.Portal>
								<Dialog.Content class="z-[2800] max-w-md w-[92vw] border-border bg-card text-card-foreground shadow-2xl rounded-3xl p-0 overflow-hidden flex flex-col max-h-[85vh]">
									<div class="p-5 pb-3 border-b border-border/60 bg-muted/20 flex flex-col gap-3">
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-2">
												<Building2Icon class="size-5 text-primary shrink-0 pointer-events-none" />
												<Dialog.Title class="text-base font-black text-foreground">Select Destination Office</Dialog.Title>
											</div>
											<Button
												variant="ghost"
												size="icon"
												onclick={() => (isOfficeDialogOpen = false)}
												class="size-8 rounded-full hover:bg-muted cursor-pointer"
											>
												<XIcon class="size-4 pointer-events-none" />
											</Button>
										</div>
										<div class="relative">
											<SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
											<Input
												type="text"
												placeholder="Search office name, code, or building..."
												bind:value={officeSearchQuery}
												class="pl-9 h-10 text-xs font-semibold rounded-xl bg-background border-border"
											/>
										</div>
									</div>

									<div class="p-3 overflow-y-auto flex flex-col gap-2 max-h-[60vh]">
										{#if filteredOfficesList.length === 0}
											<div class="p-8 text-center text-xs text-muted-foreground font-semibold flex flex-col items-center gap-2">
												<Building2Icon class="size-8 text-muted-foreground/40" />
												<span>No offices found matching "{officeSearchQuery}".</span>
											</div>
										{:else}
											{#each filteredOfficesList as office (office.id)}
												<button
													type="button"
													onclick={() => {
														selectedOfficeId = office.id;
														const foundOff = officesList.find((o: any) => o.id === office.id);
														if (foundOff) {
															const targetB = buildingsList.find((b: any) => b.id === foundOff.buildingId);
															if (prePassData) {
																prePassData = {
																	...prePassData,
																	officeId: foundOff.id,
																	officeName: foundOff.name,
																	buildingId: targetB?.id || foundOff.buildingId,
																	buildingName: targetB?.name || foundOff.name,
																};
															}
															const startLat = userGps?.lat || mainGateCoords.lat;
															const startLng = userGps?.lng || mainGateCoords.lng;
															calculatePathfindingRoutes(startLat, startLng, foundOff.id);
														}
														isOfficeDialogOpen = false;
													}}
													class="p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer {selectedOfficeId === office.id ? 'border-primary bg-primary/10 text-primary shadow-xs' : 'border-border/70 hover:border-border hover:bg-muted/40 bg-card text-foreground'}"
												>
													<div class="flex flex-col gap-0.5 min-w-0 pr-2">
														<div class="flex items-center gap-2 flex-wrap">
															<span class="font-black text-xs text-foreground truncate">{office.name}</span>
															<Badge variant="outline" class="font-mono text-[9px] font-extrabold px-1.5 py-0 border-primary/30 text-primary">
																{office.code}
															</Badge>
														</div>
														{#if office.buildingName}
															<span class="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
																<SchoolIcon class="size-3 shrink-0" />
																<span>{office.buildingName}{office.floor ? ` • Floor ${office.floor}` : ''}</span>
															</span>
														{/if}
													</div>
													{#if selectedOfficeId === office.id}
														<div class="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
															<CheckIcon class="size-3.5" />
														</div>
													{/if}
												</button>
											{/each}
										{/if}
									</div>
								</Dialog.Content>
							</Dialog.Portal>
						</Dialog.Root>

						<!-- Purpose Selection Dialog Modal (Mobile Friendly) -->
						<Dialog.Root bind:open={isPurposeDialogOpen}>
							<Dialog.Portal>
								<Dialog.Content class="z-[2800] max-w-md w-[92vw] border-border bg-card text-card-foreground shadow-2xl rounded-3xl p-0 overflow-hidden flex flex-col max-h-[85vh]">
									<div class="p-5 pb-3 border-b border-border/60 bg-muted/20 flex flex-col gap-3">
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-2">
												<SchoolIcon class="size-5 text-primary shrink-0 pointer-events-none" />
												<Dialog.Title class="text-base font-black text-foreground">Select Purpose of Visit</Dialog.Title>
											</div>
											<Button
												variant="ghost"
												size="icon"
												onclick={() => (isPurposeDialogOpen = false)}
												class="size-8 rounded-full hover:bg-muted cursor-pointer"
											>
												<XIcon class="size-4 pointer-events-none" />
											</Button>
										</div>
										<div class="relative">
											<SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
											<Input
												type="text"
												placeholder="Search reason or type custom purpose..."
												bind:value={purposeSearchInput}
												class="pl-9 h-10 text-xs font-semibold rounded-xl bg-background border-border"
											/>
										</div>
									</div>

									<div class="p-3 overflow-y-auto flex flex-col gap-2 max-h-[60vh]">
										{#if purposeSearchInput.trim() && !COMMON_VISIT_PURPOSES.some((p) => p.toLowerCase() === purposeSearchInput.trim().toLowerCase())}
											<button
												type="button"
												onclick={() => {
													purpose = purposeSearchInput.trim();
													isPurposeDialogOpen = false;
												}}
												class="p-3 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 text-primary text-left flex items-center justify-between transition-all cursor-pointer hover:bg-primary/10"
											>
												<div class="flex items-center gap-2 truncate pr-2">
													<PlusIcon class="size-4 shrink-0 text-primary" />
													<span class="font-extrabold text-xs truncate">Use Custom: "{purposeSearchInput.trim()}"</span>
												</div>
												<Badge variant="default" class="text-[9px] font-bold shrink-0">Select</Badge>
											</button>
										{/if}

										<span class="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground px-1 pt-1">
											Common Visit Reasons
										</span>

										{#each filteredCommonPurposes as p}
											<button
												type="button"
												onclick={() => {
													purpose = p;
													isPurposeDialogOpen = false;
												}}
												class="p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer {purpose === p ? 'border-primary bg-primary/10 text-primary shadow-xs' : 'border-border/70 hover:border-border hover:bg-muted/40 bg-card text-foreground'}"
											>
												<span class="font-bold text-xs pr-2">{p}</span>
												{#if purpose === p}
													<div class="size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
														<CheckIcon class="size-3" />
													</div>
												{/if}
											</button>
										{/each}
									</div>
								</Dialog.Content>
							</Dialog.Portal>
						</Dialog.Root>

						<div class="pt-2 flex gap-2">
							{#if isReturningVisitor}
								<Button
									type="button"
									onclick={resetVisitorProfile}
									variant="outline"
									class="flex-1 text-xs font-semibold rounded-xl h-10 gap-1.5 cursor-pointer"
								>
									<span>Not You?</span>
								</Button>
							{:else}
								<Button
									type="button"
									onclick={goToPrevStep}
									variant="outline"
									class="flex-1 text-xs font-semibold rounded-xl h-10 gap-1.5 cursor-pointer"
								>
									<ArrowLeftIcon data-icon="inline-start" />
									<span>Back</span>
								</Button>
							{/if}
							<Button
								type="submit"
								disabled={isSubmittingRegister}
								class="flex-1 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-10 cursor-pointer shadow-md"
							>
								<span
									>{isSubmittingRegister
										? "Saving..."
										: "Check In & Unlock Map"}</span
								>
							</Button>
						</div>
					{/if}
				</form>
			</div>
		</div>
	{/if}

	<!-- 2. INTERACTIVE MAP PORTAL CANVAS & FLOATING OVERLAYS -->
	<!-- TOP FLOATING MAP SEARCH BAR (`InputGroup`) -->
	<div
		class="absolute top-4 left-4 right-4 z-50 max-w-xl mx-auto pointer-events-auto"
	>
		<InputGroup.Root
			class="shadow-2xl rounded-2xl bg-card/95 backdrop-blur-xl border border-border transition-all flex items-center"
		>
			<InputGroup.Addon>
				<SearchIcon class="size-4 text-primary opacity-80" />
			</InputGroup.Addon>
			<InputGroup.Input
				placeholder="Search building, office, or room..."
				bind:value={searchQuery}
				onfocus={() => (isSearchOpen = true)}
				class="h-12 text-xs font-semibold pl-4 bg-transparent text-foreground placeholder:text-muted-foreground"
			/>
			<InputGroup.Addon
				align="inline-end"
				class="pr-2 flex items-center gap-1"
			>
				<!-- Map Layer Controls Popover -->
				<Popover.Root bind:open={isLayersPopoverOpen}>
					<Popover.Trigger>
						<Button
							variant="ghost"
							size="icon"
							class="size-8 rounded-xl hover:bg-muted cursor-pointer"
							title="Map Layers & 3D Overlay"
						>
							<LayersIcon class="size-4 text-primary" />
						</Button>
					</Popover.Trigger>
					<Popover.Content
						align="end"
						sideOffset={8}
						class="w-64 p-4 z-[2500] border-border bg-popover text-popover-foreground rounded-2xl shadow-2xl flex flex-col gap-3 font-semibold text-xs"
					>
						<div
							class="flex items-center gap-1.5 text-xs font-black text-foreground border-b border-border/60 pb-2"
						>
							<Layers2Icon class="size-4 text-primary" />
							<span>Map Layer Options</span>
						</div>

						<!-- Base Tile Layer Selector -->
						<div class="flex flex-col gap-1.5">
							<span
								class="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider"
								>Base Satellite / Map</span
							>
							<div class="grid grid-cols-2 gap-1.5">
								<button
									type="button"
									onclick={() => (activeTileLayer = "osm")}
									class="p-2 rounded-xl border text-xs font-extrabold cursor-pointer transition-colors flex items-center justify-center gap-1 {activeTileLayer ===
									'osm'
										? 'bg-primary text-primary-foreground border-primary'
										: 'bg-muted/40 border-border text-foreground hover:bg-muted'}"
								>
									<span>Standard</span>
								</button>
								<button
									type="button"
									onclick={() => (activeTileLayer = "esri")}
									class="p-2 rounded-xl border text-xs font-extrabold cursor-pointer transition-colors flex items-center justify-center gap-1 {activeTileLayer ===
									'esri'
										? 'bg-primary text-primary-foreground border-primary'
										: 'bg-muted/40 border-border text-foreground hover:bg-muted'}"
								>
									<span>Satellite</span>
								</button>
							</div>
						</div>

						<Separator class="my-0.5" />

						<!-- 3D Campus Overlay Switch -->
						<div class="flex items-center justify-between">
							<div class="flex flex-col">
								<span class="text-xs font-bold text-foreground"
									>3D Campus Map</span
								>
								<span class="text-[10px] text-muted-foreground"
									>Adjusted Campus Overlay</span
								>
							</div>
							<Switch bind:checked={showCampusOverlay} />
						</div>
					</Popover.Content>
				</Popover.Root>

				<!-- GPS Centering Button -->
				<Button
					onclick={requestDeviceGps}
					variant="ghost"
					size="icon"
					class="size-8 rounded-xl hover:bg-muted cursor-pointer"
					title="Center Device GPS"
				>
					<NavigationIcon
						class="size-4 text-primary {gpsStatus === 'locating'
							? 'animate-spin'
							: ''}"
					/>
				</Button>

				<!-- Theme Toggler -->
				<!-- <AnimatedThemeToggler /> -->
			</InputGroup.Addon>
		</InputGroup.Root>

		<!-- Categorized Search Suggestions Dropdown -->
		{#if isSearchOpen && searchQuery.trim()}
			<Card.Root
				class="mt-2 shadow-2xl border-border rounded-2xl bg-card/95 backdrop-blur-xl max-h-72 overflow-y-auto pointer-events-auto"
			>
				<Card.Content
					class="p-2 flex flex-col gap-2 divide-y divide-border/40"
				>
					<!-- 1. BUILDINGS & LANDMARKS -->
					{#if searchResults.buildings.length > 0}
						<div class="flex flex-col gap-1 pt-1">
							<div
								class="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
							>
								<SchoolIcon
									class="size-3 text-primary shrink-0"
								/>
								<span
									>Buildings & Landmarks ({searchResults
										.buildings.length})</span
								>
							</div>
							{#each searchResults.buildings as b}
								<button
									type="button"
									onclick={() =>
										focusSearchResult(b, "building")}
									class="w-full text-start p-2 rounded-xl hover:bg-muted/60 transition-colors flex items-center justify-between text-xs font-semibold cursor-pointer"
								>
									<div class="flex flex-col">
										<span
											class="font-extrabold text-foreground"
											>{b.name}</span
										>
										<span
											class="text-[10px] text-muted-foreground font-mono"
											>{b.code} • {b.floors || 1} Floors</span
										>
									</div>
									<Badge
										variant="outline"
										class="text-[9px] font-extrabold border-primary/30 text-primary"
										>BUILDING</Badge
									>
								</button>
							{/each}
						</div>
					{/if}

					<!-- 2. DEPARTMENTS & OFFICES -->
					{#if searchResults.offices.length > 0}
						<div class="flex flex-col gap-1 pt-2">
							<div
								class="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
							>
								<Building2Icon
									class="size-3 text-emerald-500 shrink-0"
								/>
								<span
									>Departments & Reception Desks ({searchResults
										.offices.length})</span
								>
							</div>
							{#each searchResults.offices as o}
								<button
									type="button"
									onclick={() =>
										focusSearchResult(o, "office")}
									class="w-full text-start p-2 rounded-xl hover:bg-muted/60 transition-colors flex items-center justify-between text-xs font-semibold cursor-pointer"
								>
									<div class="flex flex-col">
										<span
											class="font-extrabold text-foreground"
											>{o.name}</span
										>
										<span
											class="text-[10px] text-muted-foreground font-mono"
											>{o.code} • Head: {o.headPerson ||
												"Staff"}</span
										>
									</div>
									<Badge
										variant="secondary"
										class="text-[9px] font-mono font-bold"
										>{o.code}</Badge
									>
								</button>
							{/each}
						</div>
					{/if}

					<!-- 3. CLASSROOMS & ROOMS -->
					{#if searchResults.rooms.length > 0}
						<div class="flex flex-col gap-1 pt-2">
							<div
								class="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
							>
								<DoorClosedIcon
									class="size-3 text-indigo-500 shrink-0"
								/>
								<span
									>Rooms & Classrooms ({searchResults.rooms
										.length})</span
								>
							</div>
							{#each searchResults.rooms as r}
								<button
									type="button"
									onclick={() => focusSearchResult(r, "room")}
									class="w-full text-start p-2 rounded-xl hover:bg-muted/60 transition-colors flex items-center justify-between text-xs font-semibold cursor-pointer"
								>
									<div class="flex flex-col">
										<span
											class="font-extrabold text-foreground"
											>{r.roomName} ({r.roomNumber})</span
										>
										<span
											class="text-[10px] text-muted-foreground"
											>{r.floor} Floor</span
										>
									</div>
									<Badge
										variant="outline"
										class="text-[9px] font-mono">ROOM</Badge
									>
								</button>
							{/each}
						</div>
					{/if}

					{#if searchResults.buildings.length === 0 && searchResults.offices.length === 0 && searchResults.rooms.length === 0}
						<div
							class="p-4 text-center text-xs text-muted-foreground font-semibold"
						>
							No campus building, office, or room matches "{searchQuery}".
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	<!-- MAIN LEAFLET MAP CANVAS -->
	<div bind:this={mapContainer} class="absolute inset-0 z-0"></div>

	<!-- ULTRA-SLEEK FLOATING NAVIGATION PILL BAR -->
	{#if isRouteCardActive && (selectedOfficeId || activeOfficialPass || prePassData) && !isGateOverlayOpen}
		<div
			class="absolute top-20 left-4 right-4 md:left-auto md:right-4 z-40 md:w-auto pointer-events-auto"
		>
			<Card.Root
				class="shadow-2xl border-border bg-card/95 backdrop-blur-2xl px-3 py-2 rounded-full flex items-center justify-between gap-2 transition-all"
			>
				<div
					class="flex items-center gap-2 min-w-0 max-w-[200px] sm:max-w-xs"
				>
					<span
						class="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0"
					></span>
					<h3 class="text-xs font-black text-foreground truncate">
						{activeDestinationName}
					</h3>
				</div>

				<div class="flex items-center gap-1.5 shrink-0">
					<!-- Dynamic Footstep Distance Badge -->
					<span
						class="inline-flex items-center gap-1 text-[11px] font-extrabold text-foreground bg-muted/70 px-2 py-0.5 rounded-full border border-border/60"
						title="Distance to destination"
					>
						<FootprintsIcon
							class="size-3 text-primary shrink-0 pointer-events-none"
						/>
						<span>{activeRouteDistance}m</span>
					</span>

					<!-- Dynamic Walk Time Badge -->
					<span
						class="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20"
						title="Estimated walking time"
					>
						<ClockIcon
							class="size-3 text-emerald-500 shrink-0 pointer-events-none"
						/>
						<span
							>{activeRouteMins > 0
								? `${activeRouteMins}m `
								: ""}{activeRouteSecs}s</span
						>
					</span>

					<!-- Remove Path Display Button Icon -->
					<Button
						onclick={removePathDisplay}
						variant="ghost"
						size="icon"
						class="size-7 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
						title="Remove Path Display"
					>
						<EyeOffIcon class="size-3.5 pointer-events-none" />
					</Button>

					<!-- Open Details Drawer Button -->
					<Button
						onclick={() => (isNavDrawerOpen = true)}
						variant="outline"
						size="sm"
						class="h-7 text-[11px] font-bold rounded-full px-2.5 gap-1 cursor-pointer"
					>
						<ListIcon class="size-3 pointer-events-none" />
						<span class="hidden sm:inline">Details</span>
					</Button>
				</div>
			</Card.Root>
		</div>
	{/if}

	<!-- BOTTOM NAVIGATION DETAILS DRAWER MODAL -->
	<Dialog.Root bind:open={isNavDrawerOpen}>
		<Dialog.Content
			class="sm:max-w-md border-border bg-card p-5 shadow-2xl rounded-3xl flex flex-col gap-4"
		>
			<Dialog.Header class="flex flex-col gap-1 text-start">
				<div class="flex items-center justify-between">
					<Dialog.Title
						class="text-base font-black text-foreground flex items-center gap-2"
					>
						<RouteIcon
							class="size-4 text-emerald-500 pointer-events-none"
						/>
						<span class="truncate">{activeDestinationName}</span>
					</Dialog.Title>
					{#if gpsStatus === "active"}
						<Badge
							variant="secondary"
							class="text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 gap-1 shrink-0"
						>
							<span
								class="size-1.5 rounded-full bg-emerald-500 animate-ping"
							></span>
							<span>GPS Active</span>
						</Badge>
					{:else}
						<Badge
							variant="outline"
							class="text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1 shrink-0"
						>
							<MapPinOffIcon class="size-3 pointer-events-none" />
							<span>Location Off</span>
						</Badge>
					{/if}
				</div>
				<Dialog.Description
					class="text-xs text-muted-foreground font-semibold"
				>
					Live campus pathfinding route metrics and guidance.
				</Dialog.Description>
			</Dialog.Header>

			<!-- Distance & Est. Walk Time Metrics Grid -->
			<div
				class="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-muted/50 border border-border/60"
			>
				<div
					class="flex flex-col items-center justify-center text-center"
				>
					<span
						class="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider"
						>Total Distance</span
					>
					<span class="text-lg font-black text-foreground mt-0.5"
						>{activeRouteDistance} m</span
					>
				</div>
				<div
					class="flex flex-col items-center justify-center text-center border-l border-border/60"
				>
					<span
						class="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider"
						>Est. Walk Time</span
					>
					<span class="text-lg font-black text-emerald-500 mt-0.5">
						{activeRouteMins > 0
							? `${activeRouteMins}m `
							: ""}{activeRouteSecs}s
					</span>
				</div>
			</div>

			{#if gpsStatus !== "active"}
				<div
					class="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-2"
				>
					<RadioIcon
						class="size-4 text-amber-500 shrink-0 pointer-events-none"
					/>
					<span
						>Location Off: Enable device GPS Location for real-time
						positioning on campus.</span
					>
				</div>
			{/if}

			<Dialog.Footer class="flex gap-2 pt-2 border-t border-border/60">
				<Button
					onclick={removePathDisplay}
					variant="outline"
					class="w-full text-xs font-bold rounded-xl h-10 gap-1.5 cursor-pointer"
				>
					<EyeOffIcon class="size-4 pointer-events-none" />
					<span>Remove Path Display</span>
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<!-- BOTTOM FLOATING MAP HUD BAR (Pass Details, QR Scan & Check-Out Controls) -->
	<div
		class="absolute bottom-6 left-4 right-4 z-50 max-w-lg mx-auto pointer-events-auto"
	>
		<div
			class="p-4 rounded-3xl bg-card/95 backdrop-blur-2xl border border-border shadow-2xl flex flex-col gap-3 font-semibold text-xs text-card-foreground"
		>
			<!-- Drawer Handle Bar Indicator Pill -->
			<div
				class="w-10 h-1 bg-muted-foreground/30 hover:bg-muted-foreground/50 rounded-full mx-auto mb-1 shrink-0 transition-colors"
			></div>
			{#if activeOfficialPass}
				<!-- OFFICIAL PASS ACTIVE HUD -->
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Badge
							variant="outline"
							class="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] border-emerald-500/30 gap-1"
						>
							<CheckCircleIcon class="size-3" />
							CHECKED IN
						</Badge>
						<span class="font-bold text-foreground"
							>{activeOfficialPass.fullName}</span
						>
					</div>
					<span class="font-mono text-xs font-black text-primary"
						>{activeOfficialPass.passCode}</span
					>
				</div>

				<div
					class="flex items-center justify-between text-[11px] bg-muted/40 p-2.5 rounded-xl border border-border"
				>
					<div>
						<span
							class="text-muted-foreground block text-[9px] uppercase font-bold tracking-wider"
							>Office Destination</span
						>
						<div class="font-extrabold text-foreground">
							{activeOfficialPass.officeName || "Campus Office"}
						</div>
					</div>
					<Button
						onclick={handleSelfCheckout}
						variant="destructive"
						size="sm"
						class="font-extrabold text-xs rounded-xl h-8 gap-1 cursor-pointer"
					>
						<LogOutIcon data-icon="inline-start" class="size-3.5" />
						<span>Check Out</span>
					</Button>
				</div>
			{:else if prePassData}
				<!-- PRE-PASS ACTIVE HUD (Pending QR Desk Check-In) -->
				<div class="flex items-center justify-between">
					<Badge
						variant="outline"
						class="bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold text-[10px] border-amber-500/30 gap-1"
					>
						<RadioIcon class="size-3 animate-pulse" />
						PRE-PASS: {prePassData.officeName}
					</Badge>
					<span class="text-[10px] text-muted-foreground font-bold"
						>{prePassData.fullName}</span
					>
				</div>

				<div class="flex gap-2">
					<Button
						onclick={() => (isScannerModalOpen = true)}
						class="flex-1 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-10 gap-1.5 cursor-pointer shadow-xs"
					>
						<QrCodeIcon data-icon="inline-start" />
						<span>Scan Office QR Desk</span>
					</Button>
					<Button
						onclick={handleSelfCheckout}
						variant="outline"
						class="font-bold text-xs rounded-xl h-10 gap-1 cursor-pointer"
					>
						<LogOutIcon data-icon="inline-start" class="size-3.5" />
						<span>Gate Screen</span>
					</Button>
				</div>
			{:else}
				<!-- UNREGISTERED MAP HUD -->
				<div class="flex items-center justify-between">
					<div
						class="flex items-center gap-2 text-primary font-black text-xs"
					>
						<SparklesIcon class="size-4" />
						<span>Visiting Campus?</span>
					</div>
					<Badge variant="outline" class="text-[9px]"
						>Map Active</Badge
					>
				</div>

				<div class="flex gap-2">
					<Button
						onclick={openGateOverlay}
						class="flex-1 bg-primary text-primary-foreground font-extrabold text-xs rounded-xl h-10 gap-1.5 cursor-pointer shadow-md"
					>
						<UserCheckIcon data-icon="inline-start" />
						<span>Open Registration Gate</span>
					</Button>
					<Button
						onclick={() => (isScannerModalOpen = true)}
						variant="outline"
						class="flex-1 font-bold text-xs rounded-xl h-10 gap-1.5 cursor-pointer"
					>
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
		<Dialog.Content
			class="z-[2500] max-w-lg border-border bg-card text-card-foreground shadow-2xl rounded-3xl max-h-[90vh] overflow-y-auto"
		>
			{#if selectedBuildingForModal}
				<Dialog.Header class="pb-2">
					<div class="flex items-center justify-between">
						<Badge
							variant="outline"
							class="text-[10px] font-mono border-primary/30 text-primary uppercase"
						>
							{selectedBuildingForModal.code} • {selectedBuildingForModal.floors ||
								1} Floors
						</Badge>
					</div>
					<Dialog.Title
						class="text-lg font-black text-foreground mt-1"
						>{selectedBuildingForModal.name}</Dialog.Title
					>
					<Dialog.Description class="text-xs text-muted-foreground">
						{selectedBuildingForModal.description ||
							"Campus Academic & Administration Landmark"}
					</Dialog.Description>
				</Dialog.Header>

				<!-- Building Landmark Photo -->
				{#if selectedBuildingForModal.imageUrl}
					<div class="w-full h-44 my-2 shadow-inner">
						<LazyImage
							src={selectedBuildingForModal.imageUrl}
							alt={selectedBuildingForModal.name}
							onclick={() =>
								openImageLightbox(
									selectedBuildingForModal.imageUrl,
									selectedBuildingForModal.name,
									selectedBuildingForModal.description,
								)}
							class="size-full h-44 border border-border"
						/>
					</div>
				{/if}

				<!-- Building Meta Info -->
				<div
					class="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-3 rounded-2xl border border-border/60 my-2"
				>
					<div class="flex items-center gap-2">
						<UserIcon class="size-4 text-primary shrink-0" />
						<div>
							<span
								class="text-[9px] uppercase font-bold text-muted-foreground block"
								>Building Head</span
							>
							<span class="font-extrabold text-foreground"
								>{selectedBuildingForModal.headPerson ||
									"N/A"}</span
							>
						</div>
					</div>
					<div class="flex items-center gap-2">
						<MailIcon class="size-4 text-primary shrink-0" />
						<div>
							<span
								class="text-[9px] uppercase font-bold text-muted-foreground block"
								>Contact Email</span
							>
							<span
								class="font-mono text-[11px] font-bold text-foreground truncate block max-w-[130px]"
								>{selectedBuildingForModal.contactEmail ||
									"N/A"}</span
							>
						</div>
					</div>
				</div>

				<!-- Department Offices List inside this Building -->
				<div class="flex flex-col gap-2 pt-2 font-semibold text-xs">
					<div
						class="flex items-center justify-between border-b border-border/60 pb-1.5"
					>
						<span
							class="font-black text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5"
						>
							<Building2Icon class="size-4 text-emerald-500" />
							<span
								>Department Offices ({selectedBuildingOffices.length})</span
							>
						</span>
					</div>

					{#if selectedBuildingOffices.length > 0}
						<div
							class="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1"
						>
							{#each selectedBuildingOffices as office}
								<div
									class="p-3 rounded-2xl border border-border/80 bg-background/80 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3"
								>
									<div
										class="flex flex-col gap-0.5 text-start"
									>
										<div class="flex items-center gap-2">
											<span
												class="font-black text-foreground"
												>{office.name}</span
											>
											<Badge
												class="bg-primary/15 text-primary font-mono font-black text-[9px] px-2 py-0 rounded-md"
											>
												{office.code}
											</Badge>
										</div>
										<span
											class="text-[10px] text-muted-foreground font-semibold"
										>
											Officer in Charge: {office.headPerson ||
												"Staff Desk"}
										</span>
										{#if office.contactEmail}
											<span
												class="text-[10px] text-muted-foreground font-mono"
											>
												Email: {office.contactEmail}
											</span>
										{/if}
									</div>
									{#if office.operatingHours}
										<Badge
											variant="outline"
											class="text-[9px] font-mono shrink-0"
										>
											{office.operatingHours}
										</Badge>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<div
							class="p-3 text-center text-xs text-muted-foreground rounded-2xl border border-dashed border-border bg-muted/20"
						>
							No department offices registered in this landmark
							building.
						</div>
					{/if}
				</div>

				<!-- Rooms List inside this Building -->
				<div class="flex flex-col gap-2 pt-2 font-semibold text-xs">
					<div
						class="flex items-center justify-between border-b border-border/60 pb-1.5"
					>
						<span
							class="font-black text-xs uppercase tracking-wider text-foreground flex items-center gap-1.5"
						>
							<DoorClosedIcon class="size-4 text-primary" />
							<span
								>Building Rooms ({selectedBuildingRooms.length})</span
							>
						</span>
					</div>

					{#if selectedBuildingRooms.length > 0}
						<div
							class="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1"
						>
							{#each selectedBuildingRooms as room}
								<div
									class="p-3 rounded-2xl border border-border/80 bg-background/80 hover:bg-muted/30 transition-colors flex items-start gap-3"
								>
									{#if room.imageUrl}
										<LazyImage
											src={room.imageUrl}
											alt={room.roomName}
											onclick={() =>
												openImageLightbox(
													room.imageUrl,
													`${room.roomName} (${room.roomNumber})`,
													room.description,
												)}
											class="size-12 rounded-xl border border-border shrink-0"
										/>
									{:else}
										<div
											class="size-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0"
										>
											{room.roomNumber.slice(0, 4)}
										</div>
									{/if}
									<div class="flex-1 text-start">
										<div
											class="flex items-center justify-between"
										>
											<span
												class="font-black text-foreground"
												>{room.roomName}</span
											>
											<Badge
												variant="outline"
												class="text-[9px] font-mono"
												>{room.floor}</Badge
											>
										</div>
										<div
											class="text-[10px] text-muted-foreground font-mono font-bold"
										>
											{room.roomNumber}
										</div>
										{#if room.description}
											<p
												class="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed"
											>
												{room.description}
											</p>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<div
							class="p-4 text-center text-xs text-muted-foreground rounded-2xl border border-dashed border-border bg-muted/20"
						>
							No specific room records logged for this landmark.
						</div>
					{/if}
				</div>

				<Dialog.Footer
					class="pt-3 border-t border-border/60 flex  gap-2"
				>
					<Button
						onclick={() => (isBuildingModalOpen = false)}
						variant="outline"
					>
						Close Details
					</Button>
					<Button
						onclick={() =>
							startNavigationToBuilding(selectedBuildingForModal)}
						variant="default"
					>
						<RouteIcon class="size-4 pointer-events-none" />
						<span>Navigate Here</span>
					</Button>
				</Dialog.Footer>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<!-- STEP 4 OFFICE QR CODE SCANNER MODAL (`Dialog.Root`) -->
<Dialog.Root bind:open={isScannerModalOpen}>
	<Dialog.Portal>
		<Dialog.Content
			class="z-[2500] max-w-md border-border bg-card text-card-foreground shadow-2xl rounded-3xl"
		>
			<Dialog.Header>
				<Dialog.Title
					class="text-base font-black text-foreground flex items-center gap-2"
				>
					<QrCodeIcon class="size-5 text-primary" />
					<span>Scan Office QR Code</span>
				</Dialog.Title>
				<Dialog.Description class="text-xs text-muted-foreground">
					Point your camera at the QR code displayed on the office
					door or reception desk.
				</Dialog.Description>
			</Dialog.Header>

			<div
				class="flex flex-col gap-4 py-3 items-center text-center font-semibold text-xs"
			>
				<!-- Live Active Camera Feed Container -->
				<div
					class="relative w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden bg-black border-2 border-primary/50 shadow-inner flex items-center justify-center"
				>
					<div
						id="qr-reader"
						class="w-full h-full object-cover"
					></div>
					{#if !isQrScanning && !qrScanError}
						<div
							class="absolute inset-0 flex flex-col items-center justify-center bg-card p-4"
						>
							<QrCodeIcon
								class="size-12 text-primary/50 animate-pulse"
							/>
							<span
								class="text-xs font-bold text-muted-foreground mt-2"
								>Starting Camera...</span
							>
						</div>
					{/if}
					{#if qrScanError}
						<div
							class="absolute inset-0 flex flex-col items-center justify-center bg-card/95 p-4 text-center"
						>
							<span class="text-xs font-bold text-destructive"
								>{qrScanError}</span
							>
						</div>
					{/if}
				</div>

				<!-- Hidden Programmatic Auto-Submission Form for QR Scanner -->
				<form
					bind:this={checkInFormElement}
					action="?/checkIn"
					method="POST"
					use:enhance={handleCheckInEnhance}
					class="hidden"
				>
					<input
						type="hidden"
						name="logId"
						value={prePassData?.logId ||
							activeOfficialPass?.id ||
							""}
					/>
					<input
						type="hidden"
						name="registeredVisitorId"
						value={prePassData?.registeredVisitorId || ""}
					/>
					<input
						type="hidden"
						name="fullName"
						value={prePassData?.fullName || ""}
					/>
					<input
						type="hidden"
						name="firstName"
						value={prePassData?.firstName || ""}
					/>
					<input
						type="hidden"
						name="middleName"
						value={prePassData?.middleName || ""}
					/>
					<input
						type="hidden"
						name="lastName"
						value={prePassData?.lastName || ""}
					/>
					<input
						type="hidden"
						name="email"
						value={prePassData?.email || ""}
					/>
					<input
						type="hidden"
						name="phone"
						value={prePassData?.phone || ""}
					/>
					<input
						type="hidden"
						name="officeId"
						value={prePassData?.officeId || ""}
					/>
					<input
						type="hidden"
						name="purpose"
						value={prePassData?.purpose || ""}
					/>
					<input
						type="hidden"
						name="photoUrl"
						value={prePassData?.photoUrl || ""}
					/>
					<input
						bind:this={hiddenOfficeCodeInput}
						type="hidden"
						name="officeCode"
						value=""
					/>
				</form>

				{#if qrScanErrorAlert}
					<Alert.Root
						variant="destructive"
						class="rounded-2xl border-destructive/50 bg-destructive/10 text-destructive my-1"
					>
						<AlertCircleIcon
							class="size-4 shrink-0 pointer-events-none"
						/>
						<Alert.Title class="font-extrabold text-xs"
							>Mismatched Office Location</Alert.Title
						>
						<Alert.Description
							class="text-xs leading-relaxed font-semibold"
						>
							{qrScanErrorAlert}
						</Alert.Description>
					</Alert.Root>
				{/if}

				<Separator class="my-1" />

				<!-- Manual Code Fallback Input Server Action Form (`InputGroup`) -->
				<form
					action="?/checkIn"
					method="POST"
					use:enhance={({ cancel }) => {
						if (!validateScannedOfficeCode(manualScanCode)) {
							cancel();
							return;
						}
						return handleCheckInEnhance();
					}}
					class="w-full flex flex-col gap-1.5 text-start"
				>
					<input
						type="hidden"
						name="logId"
						value={prePassData?.logId ||
							activeOfficialPass?.id ||
							""}
					/>
					<input
						type="hidden"
						name="registeredVisitorId"
						value={prePassData?.registeredVisitorId || ""}
					/>
					<input
						type="hidden"
						name="fullName"
						value={prePassData?.fullName || ""}
					/>
					<input
						type="hidden"
						name="firstName"
						value={prePassData?.firstName || ""}
					/>
					<input
						type="hidden"
						name="middleName"
						value={prePassData?.middleName || ""}
					/>
					<input
						type="hidden"
						name="lastName"
						value={prePassData?.lastName || ""}
					/>
					<input
						type="hidden"
						name="email"
						value={prePassData?.email || ""}
					/>
					<input
						type="hidden"
						name="phone"
						value={prePassData?.phone || ""}
					/>
					<input
						type="hidden"
						name="officeId"
						value={prePassData?.officeId || ""}
					/>
					<input
						type="hidden"
						name="purpose"
						value={prePassData?.purpose || ""}
					/>
					<input
						type="hidden"
						name="photoUrl"
						value={prePassData?.photoUrl || ""}
					/>

					<span
						class="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider"
						>Camera Blurry or Broken? Enter Code:</span
					>
					<InputGroup.Root class="rounded-xl border border-border">
						<InputGroup.Input
							name="officeCode"
							placeholder="e.g. OFF-REGISTRAR"
							bind:value={manualScanCode}
							class="h-9 text-xs font-mono uppercase tracking-wider"
						/>
						<InputGroup.Addon align="inline-end" class="pr-1">
							<Button
								type="submit"
								disabled={isSubmittingCheckIn}
								size="sm"
								class="h-7 text-xs font-bold rounded-lg px-3"
							>
								{isSubmittingCheckIn
									? "Checking in..."
									: "Submit"}
							</Button>
						</InputGroup.Addon>
					</InputGroup.Root>
				</form>
			</div>

			<Dialog.Footer class="pt-2 border-t border-border/60">
				<Button
					onclick={() => (isScannerModalOpen = false)}
					variant="outline"
					class="w-full text-xs font-semibold rounded-xl h-10 cursor-pointer"
				>
					Close Scanner
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<!-- FULL-SCREEN IMAGE EXPANSION LIGHTBOX MODAL (`Dialog.Root`) -->
<Dialog.Root bind:open={isLightboxOpen}>
	<Dialog.Portal>
		<Dialog.Overlay
			class="z-[2999] bg-black/80 backdrop-blur-2xl transition-all duration-300"
		/>
		<Dialog.Content
			class="z-[3000] max-w-3xl p-4 border-border/80 bg-card/95 backdrop-blur-3xl text-card-foreground shadow-2xl rounded-3xl overflow-hidden flex flex-col gap-3"
		>
			{#if expandedImage}
				<Dialog.Header
					class="flex items-center justify-between border-b border-border/60 pb-2"
				>
					<div class="text-start">
						<Dialog.Title class="text-sm font-black text-foreground"
							>{expandedImage.title}</Dialog.Title
						>
						{#if expandedImage.caption}
							<Dialog.Description
								class="text-xs text-muted-foreground line-clamp-2 mt-0.5"
								>{expandedImage.caption}</Dialog.Description
							>
						{/if}
					</div>
				</Dialog.Header>
				<div
					class="relative w-full max-h-[75vh] flex items-center justify-center rounded-2xl overflow-hidden bg-black/90 border border-border/80 p-2 shadow-2xl"
				>
					<LazyImage
						src={expandedImage.url}
						alt={expandedImage.title}
						class="w-full max-h-[70vh] object-contain rounded-xl"
					/>
				</div>
				<Dialog.Footer class="pt-2 border-t border-border/60">
					<Button
						onclick={() => (isLightboxOpen = false)}
						variant="outline"
						class="w-full text-xs font-bold rounded-xl h-9 cursor-pointer"
					>
						Close Image Viewer
					</Button>
				</Dialog.Footer>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	:global(.leaflet-marker-icon) {
		transition: none !important;
	}
</style>
