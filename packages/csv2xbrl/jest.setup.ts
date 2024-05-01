import { XBRLError } from "./src/errors";

expect.extend({
    toThrowXBRLError(received, expectedIdentifier) {
        if (typeof received === 'function') {
            try {
                received();
                return {
                    message: () => `expected function to throw an XBRLError`,
                    pass: false,
                };
            } catch (error: any) {
                return checkError(error, expectedIdentifier);
            }
        }
        else return checkError(received, expectedIdentifier);
    }
});

function checkError(error: any, expectedIdentifier: string) {
    if (error instanceof XBRLError) {
        if (!expectedIdentifier || expectedIdentifier === error.identifier) {
            return {
                message: () => "Correctly threw an XBRLError",
                pass: true,
            };
        } else {
            return {
                message: () => `expected function to throw an XBRLError with identifier ${expectedIdentifier}, but it threw ${error.identifier}`,
                pass: false,
            };
        }
    } else {
        return {
            message: () => `expected function to throw an XBRLError but threw ${error}`,
            pass: false,
        };
    }
}
