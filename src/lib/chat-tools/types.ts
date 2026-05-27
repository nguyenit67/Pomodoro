export interface ChatCompletionTool {
	type: "function";
	function: {
		name: string;
		description: string;
		parameters: Record<string, unknown>;
	};
}

export interface ToolResult {
	success: boolean;
	data?: unknown;
	error?: string;
	message?: string;
}
