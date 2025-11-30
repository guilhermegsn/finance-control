export const generateRandomId = () => {
    return `${Date.now().toString()}${Math.random().toString(36).slice(2, 10)}`
}

export function getMonthName(monthNumber: number) {
    const date = new Date(2023, monthNumber - 1)
    const monthName = date.toLocaleString('pt-BR', { month: 'short' })
    return monthName.replace(".", "");
}

