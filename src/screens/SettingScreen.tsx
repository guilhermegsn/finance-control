import { View, Text } from 'react-native'
import React from 'react'
import { Button } from 'react-native-paper'
import { getAllItems } from '../database/realmHelpers'

export default function SettingScreen() {
    return (
        <View>
            <Button onPress={() => console.log(getAllItems('RecurringTransaction'))}>RecurringTransaction</Button>
            <Button onPress={() => console.log(getAllItems('Override'))}>Override</Button>
            <Button onPress={() => console.log(getAllItems('Transaction'))}>Transaction</Button>
            <Button onPress={() => console.log(getAllItems('Balance'))}>Balance</Button>
        </View>
    )
}