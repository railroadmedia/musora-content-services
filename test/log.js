export function log(message, forceEnabled = false) {
    if (process.env.DEBUG === 'true' || forceEnabled) {
        console.log(message);
    }
}