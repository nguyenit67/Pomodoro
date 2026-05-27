import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolResult } from "./types";

// ─── helpers ──────────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	if (h > 0) return `${h}h ${m}m`;
	return `${m}m`;
}

function dateRange(period?: string, startDate?: string, endDate?: string): { from?: string; to?: string } {
	if (startDate || endDate) return { from: startDate, to: endDate };

	const now = new Date();
	switch (period) {
		case "today": {
			const d = now.toISOString().split("T")[0];
			return { from: d, to: d };
		}
		case "week": {
			const start = new Date(now);
			start.setDate(start.getDate() - 7);
			return { from: start.toISOString().split("T")[0], to: now.toISOString().split("T")[0] };
		}
		case "month": {
			const start = new Date(now);
			start.setDate(start.getDate() - 30);
			return { from: start.toISOString().split("T")[0], to: now.toISOString().split("T")[0] };
		}
		default:
			return {};
	}
}

// ─── tool implementations ─────────────────────────────────────────────
async function executeCreateTask(
	args: Record<string, unknown>,
	supabase: SupabaseClient,
	userId: string
): Promise<ToolResult> {
	const title = args.title as string;
	if (!title?.trim()) return { success: false, error: "Title is required" };

	const payload: Record<string, unknown> = {
		user_id: userId,
		title: title.trim(),
		description: (args.description as string) || null,
		priority: ((args.priority as string) || "MEDIUM").toUpperCase(),
		estimate_pomodoros: Number(args.estimate_pomodoros) || 1,
		tags: Array.isArray(args.tags) ? args.tags : [],
	};
	if (args.due_date) payload.due_date = args.due_date;

	const { data, error } = await supabase.from("tasks").insert(payload).select("*").single();

	if (error) return { success: false, error: error.message };
	return {
		success: true,
		data,
		message: `Task "${data.title}" created (priority: ${data.priority}, est: ${data.estimate_pomodoros} pomodoro(s)).`,
	};
}

async function executeUpdateTask(
	args: Record<string, unknown>,
	supabase: SupabaseClient,
	userId: string
): Promise<ToolResult> {
	const identifier = args.task_identifier as string;
	if (!identifier?.trim()) return { success: false, error: "task_identifier is required" };

	// Fuzzy search
	const { data: matches } = await supabase
		.from("tasks")
		.select("id, title, status, priority")
		.eq("user_id", userId)
		.eq("is_deleted", false)
		.ilike("title", `%${identifier.trim()}%`)
		.limit(5);

	if (!matches?.length) {
		return { success: false, error: `No task found matching "${identifier}".` };
	}
	if (matches.length > 1) {
		const list = matches.map((t) => `• "${t.title}" (${t.status})`).join("\n");
		return {
			success: false,
			error: `Multiple tasks match "${identifier}". Please be more specific:\n${list}`,
		};
	}

	const task = matches[0];
	const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
	if (args.title !== undefined) updates.title = (args.title as string).trim();
	if (args.description !== undefined) updates.description = args.description;
	if (args.priority !== undefined) updates.priority = (args.priority as string).toUpperCase();
	if (args.status !== undefined) updates.status = (args.status as string).toUpperCase();
	if (args.tags !== undefined) updates.tags = args.tags;
	if (args.due_date !== undefined) updates.due_date = args.due_date;

	const { data, error } = await supabase.from("tasks").update(updates).eq("id", task.id).select("*").single();

	if (error) return { success: false, error: error.message };
	return {
		success: true,
		data,
		message: `Task "${data.title}" updated (status: ${data.status}, priority: ${data.priority}).`,
	};
}

async function executeSearchTasks(
	args: Record<string, unknown>,
	supabase: SupabaseClient,
	userId: string
): Promise<ToolResult> {
	let query = supabase
		.from("tasks")
		.select("id, title, description, status, priority, tags, estimate_pomodoros, due_date, created_at")
		.eq("user_id", userId)
		.eq("is_deleted", false);

	const q = args.query as string | undefined;
	const status = args.status as string | undefined;
	const priority = args.priority as string | undefined;

	if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
	if (status && status !== "all") query = query.eq("status", status.toUpperCase());
	if (priority && priority !== "all") query = query.eq("priority", priority.toUpperCase());

	const { data, error } = await query
		.order("display_order", { ascending: true })
		.order("created_at", { ascending: false })
		.limit(15);

	if (error) return { success: false, error: error.message };
	return {
		success: true,
		data,
		message: `Found ${data.length} task(s).`,
	};
}

async function executeGetStats(
	args: Record<string, unknown>,
	supabase: SupabaseClient,
	userId: string
): Promise<ToolResult> {
	const { from, to } = dateRange(args.period as string, args.start_date as string, args.end_date as string);

	let query = supabase.from("sessions").select("duration, mode, created_at").eq("user_id", userId);
	if (from) query = query.gte("created_at", from);
	if (to) {
		const end = new Date(to);
		end.setDate(end.getDate() + 1);
		query = query.lt("created_at", end.toISOString());
	}

	const { data: sessions, error } = await query;
	if (error) return { success: false, error: error.message };

	let totalFocusTime = 0;
	let completedSessions = 0;
	(sessions ?? []).forEach((s) => {
		if (s.mode === "work") {
			totalFocusTime += s.duration;
			completedSessions++;
		}
	});

	// Streak
	const { data: streak } = await supabase.from("streaks").select("current, longest").eq("user_id", userId).single();

	const stats = {
		totalFocusTime,
		totalFocusFormatted: formatDuration(totalFocusTime),
		completedSessions,
		streak: { current: streak?.current ?? 0, longest: streak?.longest ?? 0 },
		period: args.period || "all",
	};

	return {
		success: true,
		data: stats,
		message: `Focus time: ${stats.totalFocusFormatted}, Sessions: ${completedSessions}, Streak: ${stats.streak.current} day(s) (best: ${stats.streak.longest}).`,
	};
}

async function executeGetSessions(
	args: Record<string, unknown>,
	supabase: SupabaseClient,
	userId: string
): Promise<ToolResult> {
	const limit = Math.min(Number(args.limit) || 10, 50);

	let query = supabase
		.from("sessions")
		.select("id, duration, mode, created_at, tasks(title)")
		.eq("user_id", userId)
		.order("created_at", { ascending: false });

	if (args.start_date) query = query.gte("created_at", args.start_date as string);
	if (args.end_date) {
		const end = new Date(args.end_date as string);
		end.setDate(end.getDate() + 1);
		query = query.lt("created_at", end.toISOString());
	}

	const { data, error } = await query.limit(limit);
	if (error) return { success: false, error: error.message };

	return {
		success: true,
		data,
		message: `Returning ${data.length} session(s).`,
	};
}

// ─── public dispatcher ────────────────────────────────────────────────
export async function executeTool(
	toolName: string,
	args: Record<string, unknown>,
	supabase: SupabaseClient,
	userId: string
): Promise<ToolResult> {
	switch (toolName) {
		case "create_task":
			return executeCreateTask(args, supabase, userId);
		case "update_task":
			return executeUpdateTask(args, supabase, userId);
		case "search_tasks":
			return executeSearchTasks(args, supabase, userId);
		case "get_stats":
			return executeGetStats(args, supabase, userId);
		case "get_sessions":
			return executeGetSessions(args, supabase, userId);
		default:
			return { success: false, error: `Unknown tool: ${toolName}` };
	}
}
