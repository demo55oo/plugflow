const COMPOSIO_API_URL = "https://backend.composio.dev/api/v3";

export async function testComposio(credentials: Record<string, string>) {
  try {
    const apiKey = credentials.COMPOSIO_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "COMPOSIO_API_KEY is required",
      };
    }

    const response = await fetch(`${COMPOSIO_API_URL}/toolkits?limit=1`, {
      headers: { "x-api-key": apiKey },
    });

    if (response.ok) {
      return { success: true };
    }
    const error = await response.text();
    return { success: false, error };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
