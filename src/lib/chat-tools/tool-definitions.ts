import type { ChatCompletionTool } from "./types";

export const CHAT_TOOLS: ChatCompletionTool[] = [
	{
		type: "function",
		function: {
			name: "create_task",
			description:
				"Create a new Pomodoro task for the user. Use when the user wants to add a new task, todo, or work item.",
			parameters: {
				type: "object",
				properties: {
					title: { type: "string", description: "Task title" },
					description: { type: "string", description: "Optional task description" },
					priority: {
						type: "string",
						enum: ["LOW", "MEDIUM", "HIGH"],
						description: "Task priority level. Default MEDIUM.",
					},
					estimate_pomodoros: {
						type: "number",
						description: "Estimated number of Pomodoro sessions. Default 1.",
					},
					tags: {
						type: "array",
						items: { type: "string" },
						description: "Tags to categorize the task",
					},
					due_date: {
						type: "string",
						description: "Due date in ISO format (YYYY-MM-DD)",
					},
				},
				required: ["title"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "update_task",
			description:
				"Update an existing task. Use when the user wants to change a task's title, description, priority, status, tags, or other properties. The task is found by fuzzy title match.",
			parameters: {
				type: "object",
				properties: {
					task_identifier: {
						type: "string",
						description: "The task name or partial title to search for",
					},
					title: { type: "string", description: "New task title" },
					description: { type: "string", description: "New task description" },
					priority: {
						type: "string",
						enum: ["LOW", "MEDIUM", "HIGH"],
						description: "New priority level",
					},
					status: {
						type: "string",
						enum: ["TODO", "DOING", "DONE"],
						description: "New task status",
					},
					tags: {
						type: "array",
						items: { type: "string" },
						description: "New tags for the task",
					},
					due_date: {
						type: "string",
						description: "New due date in ISO format (YYYY-MM-DD)",
					},
				},
				required: ["task_identifier"],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "search_tasks",
			description:
				"Search and list the user's tasks. Use when the user wants to see their tasks, find specific tasks, or filter by status/priority.",
			parameters: {
				type: "object",
				properties: {
					query: {
						type: "string",
						description: "Search query to filter tasks by title or description",
					},
					status: {
						type: "string",
						enum: ["TODO", "DOING", "DONE", "all"],
						description: "Filter by task status. Default 'all'.",
					},
					priority: {
						type: "string",
						enum: ["LOW", "MEDIUM", "HIGH", "all"],
						description: "Filter by priority. Default 'all'.",
					},
				},
				required: [],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "get_stats",
			description:
				"Get the user's productivity statistics including total focus time, completed sessions, and streak. Use when the user asks about their productivity, stats, or progress.",
			parameters: {
				type: "object",
				properties: {
					period: {
						type: "string",
						enum: ["today", "week", "month", "all"],
						description: "Time period for stats. Default 'today'.",
					},
					start_date: {
						type: "string",
						description: "Custom start date in ISO format (YYYY-MM-DD)",
					},
					end_date: {
						type: "string",
						description: "Custom end date in ISO format (YYYY-MM-DD)",
					},
				},
				required: [],
			},
		},
	},
	{
		type: "function",
		function: {
			name: "get_sessions",
			description:
				"Get the user's Pomodoro session history. Use when the user asks about their recent sessions or work history.",
			parameters: {
				type: "object",
				properties: {
					limit: {
						type: "number",
						description: "Maximum number of sessions to return. Default 10.",
					},
					start_date: {
						type: "string",
						description: "Start date filter in ISO format (YYYY-MM-DD)",
					},
					end_date: {
						type: "string",
						description: "End date filter in ISO format (YYYY-MM-DD)",
					},
				},
				required: [],
			},
		},
	},
];
