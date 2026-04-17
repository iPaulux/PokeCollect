import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import SetsScreen from './src/screens/SetsScreen';
import CardsScreen from './src/screens/CardsScreen';
import SearchScreen from './src/screens/SearchScreen';
import ListsScreen from './src/screens/ListsScreen';
import ListDetailScreen from './src/screens/ListDetailScreen';
import { LanguageProvider, useLang, LANGUAGES } from './src/utils/LanguageContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function LangPicker() {
  const { lang, setLang } = useLang();
  return (
    <View style={styles.picker}>
      {LANGUAGES.map((l) => (
        <TouchableOpacity
          key={l.code}
          onPress={() => setLang(l.code)}
          style={[styles.langBtn, lang === l.code && styles.langBtnActive]}
        >
          <Text style={[styles.langText, lang === l.code && styles.langTextActive]}>
            {l.flag} {l.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const headerOpts = {
  headerStyle: { backgroundColor: '#16213e' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
};

function SetsStack() {
  return (
    <Stack.Navigator screenOptions={{ ...headerOpts, headerRight: () => <LangPicker /> }}>
      <Stack.Screen name="Sets" component={SetsScreen} options={{ title: 'Collection' }} />
      <Stack.Screen
        name="Cards"
        component={CardsScreen}
        options={({ route }) => ({ title: route.params.set.name })}
      />
    </Stack.Navigator>
  );
}

function SearchStack() {
  return (
    <Stack.Navigator screenOptions={headerOpts}>
      <Stack.Screen name="Search" component={SearchScreen} options={{ title: 'Recherche' }} />
    </Stack.Navigator>
  );
}

function ListsStack() {
  return (
    <Stack.Navigator screenOptions={headerOpts}>
      <Stack.Screen name="Lists" component={ListsScreen} options={{ title: 'Mes Listes' }} />
      <Stack.Screen
        name="ListDetail"
        component={ListDetailScreen}
        options={({ route }) => ({ title: route.params.list.name })}
      />
    </Stack.Navigator>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#16213e',
          borderTopColor: '#2a2a4a',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#E63F00',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIconStyle: { display: 'none' },
      }}
    >
      <Tab.Screen
        name="SetsTab"
        component={SetsStack}
        options={{ tabBarLabel: '📦  Collection' }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchStack}
        options={{ tabBarLabel: '🔍  Recherche' }}
      />
      <Tab.Screen
        name="ListsTab"
        component={ListsStack}
        options={{ tabBarLabel: '📋  Mes Listes' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppTabs />
      </NavigationContainer>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  picker: { flexDirection: 'row', gap: 4, marginRight: 4 },
  langBtn: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
  langBtnActive: { backgroundColor: '#E63F00' },
  langText: { color: '#666', fontSize: 11, fontWeight: '600' },
  langTextActive: { color: '#fff' },
});
