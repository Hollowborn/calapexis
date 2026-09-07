import type { AppNotification, NotificationType } from "$lib/types";
import { supabase, getDbClient } from "$lib/supabase";
import { playNotificationChime } from "$lib/audio-chime";
import { toast } from "svelte-sonner";

class NotificationStateManager {
	notifications = $state<AppNotification[]>([]);
	isModalOpen = $state(false);
	isSoundEnabled = $state(true);
	isInitialized = $state(false);
	userRole = $state<string | null>(null);
	userOfficeId = $state<string | null>(null);
	userId = $state<string | null>(null);

	private realtimeChannel: any = null;

	constructor() {
		if (typeof window !== "undefined") {
			const savedSound = localStorage.getItem("calapexis_sound_enabled");
			this.isSoundEnabled = savedSound === null ? true : savedSound === "true";
		}
	}

	get unreadCount(): number {
		return this.notifications.filter((n) => !n.isRead).length;
	}

	get unreadNotifications(): AppNotification[] {
		return this.notifications.filter((n) => !n.isRead);
	}

	toggleSound() {
		this.isSoundEnabled = !this.isSoundEnabled;
		if (typeof window !== "undefined") {
			localStorage.setItem("calapexis_sound_enabled", String(this.isSoundEnabled));
		}
		if (this.isSoundEnabled) {
			playNotificationChime("default");
			toast.success("Notification sound enabled", {
				description: "You will hear an audio chime on new alerts."
			});
		} else {
			toast.info("Notification sound muted", {
				description: "Audio alerts have been silenced."
			});
		}
	}

	testChime() {
		playNotificationChime("pass_registered");
	}

	openModal() {
		this.isModalOpen = true;
	}

	closeModal() {
		this.isModalOpen = false;
	}

	async init(role: string, officeId?: string | null, uid?: string | null) {
		this.userRole = role;
		this.userOfficeId = officeId || null;
		this.userId = uid || null;

		if (this.isInitialized) return;
		this.isInitialized = true;

		await this.fetchNotifications();
		this.subscribeRealtime();
	}

	async fetchNotifications() {
		const client = getDbClient();
		if (!client) {
			this.generateInitialFallbackNotifications();
			return;
		}

		try {
			// Query persistent notifications table
			let query = client
				.from("notifications")
				.select("*")
				.order("created_at", { ascending: false })
				.limit(40);

			// Role and office filtering
			if (this.userRole === "staff" && this.userOfficeId) {
				query = query.or(`office_id.eq.${this.userOfficeId},recipient_role.eq.staff,recipient_role.eq.all`);
			} else if (this.userRole === "security") {
				query = query.or(`recipient_role.eq.security,recipient_role.eq.all`);
			} else if (this.userRole === "admin") {
				// Admins see all notifications
			}

			const { data, error } = await query;

			if (!error && data && data.length > 0) {
				this.notifications = data.map((row: any) => ({
					id: row.id,
					recipientId: row.recipient_id,
					recipientRole: row.recipient_role,
					officeId: row.office_id,
					officeName: row.office_name,
					title: row.title,
					message: row.message,
					type: row.type as NotificationType,
					linkUrl: row.link_url,
					isRead: row.is_read,
					createdAt: row.created_at
				}));
			} else {
				// If table is newly created or empty, seed sample initial notifications for role
				this.generateInitialFallbackNotifications();
			}
		} catch (e) {
			console.warn("Could not fetch notifications from Supabase, using local state:", e);
			this.generateInitialFallbackNotifications();
		}
	}

	private generateInitialFallbackNotifications() {
		if (this.notifications.length > 0) return;

		const now = new Date();
		const items: AppNotification[] = [];

		if (this.userRole === "security" || this.userRole === "admin") {
			items.push({
				id: "sample-sec-1",
				title: "🚨 Gate Pass Registered",
				message: "A visitor has registered an entrance pass for the Administration Office.",
				type: "pass_registered",
				linkUrl: "/dashboard/security",
				isRead: false,
				createdAt: new Date(now.getTime() - 1000 * 60 * 5).toISOString()
			});
		}

		if (this.userRole === "staff" || this.userRole === "admin") {
			items.push({
				id: "sample-staff-1",
				title: "🛎️ Visitor Arrived at Desk",
				message: "A visitor has scanned your office QR desk code and checked in.",
				type: "desk_arrival",
				linkUrl: "/dashboard/staff",
				isRead: false,
				createdAt: new Date(now.getTime() - 1000 * 60 * 18).toISOString()
			});
		}

		items.push({
			id: "sample-sys-1",
			title: "⚡ Portal System Active",
			message: "Real-time visitor telemetry and notification channels are synchronized.",
			type: "system",
			linkUrl: "/dashboard",
			isRead: true,
			createdAt: new Date(now.getTime() - 1000 * 60 * 60).toISOString()
		});

		this.notifications = items;
	}

	private subscribeRealtime() {
		const client = getDbClient();
		if (!client || this.realtimeChannel) return;

		// Subscribe to notifications table inserts
		this.realtimeChannel = client
			.channel("calapexis-realtime-notifications")
			.on(
				"postgres_changes",
				{
					event: "INSERT",
					schema: "public",
					table: "notifications"
				},
				(payload: any) => {
					const newRow = payload.new;
					if (!newRow) return;

					// Check role & office relevancy
					if (
						this.userRole === "staff" &&
						newRow.office_id &&
						this.userOfficeId &&
						newRow.office_id !== this.userOfficeId &&
						newRow.recipient_role !== "all"
					) {
						return;
					}

					if (
						this.userRole === "security" &&
						newRow.recipient_role !== "security" &&
						newRow.recipient_role !== "all"
					) {
						return;
					}

					const notif: AppNotification = {
						id: newRow.id,
						recipientId: newRow.recipient_id,
						recipientRole: newRow.recipient_role,
						officeId: newRow.office_id,
						officeName: newRow.office_name,
						title: newRow.title,
						message: newRow.message,
						type: newRow.type as NotificationType,
						linkUrl: newRow.link_url,
						isRead: false,
						createdAt: newRow.created_at || new Date().toISOString()
					};

					this.addNotification(notif);
				}
			)
			// Also listen directly to visitor_logs for immediate fallback notifications
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "visitor_logs"
				},
				(payload: any) => {
					this.handleVisitorLogEvent(payload);
				}
			)
			.subscribe();
	}

	private handleVisitorLogEvent(payload: any) {
		const { eventType, new: newLog, old: oldLog } = payload;
		if (!newLog) return;

		const now = new Date().toISOString();

		// Event: New Visitor Registration (Alert Security & Admin)
		if (eventType === "INSERT") {
			if (this.userRole === "security" || this.userRole === "admin") {
				const notif: AppNotification = {
					id: `vlog-reg-${newLog.id}`,
					title: "🚨 New Visitor Registered",
					message: `Passcode ${newLog.pass_code || "VIS"} registered for campus entry.`,
					type: "pass_registered",
					linkUrl: "/dashboard/security",
					isRead: false,
					createdAt: now
				};
				this.addNotification(notif);
			}
		}

		// Event: Visitor Checked Into Office Desk (Alert Office Staff & Admin)
		if (eventType === "UPDATE" && newLog.status === "checked_in" && oldLog?.status !== "checked_in") {
			if (
				this.userRole === "admin" ||
				(this.userRole === "staff" && (!this.userOfficeId || newLog.office_id === this.userOfficeId))
			) {
				const notif: AppNotification = {
					id: `vlog-arr-${newLog.id}`,
					title: "🛎️ Visitor Arrived at Desk",
					message: `Visitor has checked in for ${newLog.purpose || "visit"}.`,
					type: "desk_arrival",
					linkUrl: "/dashboard/staff",
					isRead: false,
					createdAt: now
				};
				this.addNotification(notif);
			}
		}

		// Event: Visitor Checked Out (Alert Staff, Security & Admin)
		if (eventType === "UPDATE" && newLog.status === "checked_out" && oldLog?.status !== "checked_out") {
			if (
				this.userRole === "admin" ||
				this.userRole === "security" ||
				(this.userRole === "staff" && (!this.userOfficeId || newLog.office_id === this.userOfficeId))
			) {
				const notif: AppNotification = {
					id: `vlog-out-${newLog.id}`,
					title: "👋 Visitor Departed",
					message: `Visitor pass ${newLog.pass_code || ""} has checked out.`,
					type: "checkout",
					linkUrl: this.userRole === "staff" ? "/dashboard/staff" : "/dashboard/security",
					isRead: false,
					createdAt: now
				};
				this.addNotification(notif);
			}
		}
	}

	addNotification(notif: AppNotification) {
		// Prevent duplicate entries by ID
		if (this.notifications.some((n) => n.id === notif.id)) return;

		this.notifications = [notif, ...this.notifications];

		// Play chime if sound enabled
		if (this.isSoundEnabled) {
			playNotificationChime(notif.type as any);
		}

		// Show live toast
		toast.info(notif.title, {
			description: notif.message,
			action: notif.linkUrl
				? {
						label: "View",
						onClick: () => {
							if (typeof window !== "undefined") {
								window.location.href = notif.linkUrl!;
							}
						}
					}
				: undefined
		});
	}

	async markAsRead(id: string) {
		this.notifications = this.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));

		const client = getDbClient();
		if (client && !id.startsWith("sample-") && !id.startsWith("vlog-")) {
			try {
				await client.from("notifications").update({ is_read: true }).eq("id", id);
			} catch (e) {
				console.warn("Could not mark notification as read in database:", e);
			}
		}
	}

	async markAllAsRead() {
		this.notifications = this.notifications.map((n) => ({ ...n, isRead: true }));

		const client = getDbClient();
		if (client) {
			try {
				if (this.userRole === "staff" && this.userOfficeId) {
					await client.from("notifications").update({ is_read: true }).eq("office_id", this.userOfficeId);
				} else if (this.userRole === "security") {
					await client.from("notifications").update({ is_read: true }).eq("recipient_role", "security");
				} else {
					await client.from("notifications").update({ is_read: true }).eq("is_read", false);
				}
			} catch (e) {
				console.warn("Could not mark all notifications as read in database:", e);
			}
		}

		toast.success("All notifications marked as read");
	}

	clearAll() {
		this.notifications = [];
		toast.info("Notifications cleared from view");
	}

	destroy() {
		if (this.realtimeChannel) {
			const client = getDbClient();
			client?.removeChannel(this.realtimeChannel);
			this.realtimeChannel = null;
		}
		this.isInitialized = false;
	}
}

export const notificationState = new NotificationStateManager();
