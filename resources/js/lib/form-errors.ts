/**
 * The message to show in a toast when a save is refused: the first thing the server actually complained about
 * (with how many more there are), instead of a vague "check the form". Some complaints are about fields that are
 * not on screen at the time, so the toast may be the only place the person ever sees them.
 */
export function firstErrorMessage(errors: Record<string, string>, fallback: string): string {
    const messages = Object.values(errors).filter((message) => message);

    if (messages.length === 0) {
        return fallback;
    }

    return messages.length > 1 ? `${messages[0]} (+${messages.length - 1} more)` : messages[0];
}
