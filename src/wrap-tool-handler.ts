// ABOUTME: Shared MCP tool response wrapper
// ABOUTME: Wraps tool handler results and errors into MCP-compliant format

export type ToolResponse = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

export async function wrapToolHandler<T>(handler: () => Promise<T>): Promise<ToolResponse> {
  try {
    const result = await handler();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    console.error('Tool handler error:', error);
    const errorMessage = error instanceof Error
      ? error.message
      : `Unexpected error: ${String(error)}`;
    return {
      content: [{ type: 'text', text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
}
