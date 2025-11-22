export const generateRandomId = () => {
    return `${Date.now().toString()}${Math.random().toString(36).slice(2, 10)}`
}