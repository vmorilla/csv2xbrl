declare namespace jest {
    interface Matchers<R> {
        toThrowXBRLError(expectedIdentifier?: string): R;
    }
}