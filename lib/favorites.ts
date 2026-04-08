import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@ganh18_favorites';

export async function getFavorites(): Promise<string[]> {
  try {
    const data = await AsyncStorage.getItem(FAVORITES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
}

export async function addFavorite(movieSlug: string): Promise<void> {
  try {
    const favorites = await getFavorites();
    if (!favorites.includes(movieSlug)) {
      favorites.push(movieSlug);
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }
  } catch (error) {
    console.error('Error adding favorite:', error);
  }
}

export async function removeFavorite(movieSlug: string): Promise<void> {
  try {
    const favorites = await getFavorites();
    const updated = favorites.filter(slug => slug !== movieSlug);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error removing favorite:', error);
  }
}

export async function toggleFavorite(movieSlug: string): Promise<boolean> {
  try {
    const favorites = await getFavorites();
    const isFavorited = favorites.includes(movieSlug);
    if (isFavorited) {
      await removeFavorite(movieSlug);
      return false;
    } else {
      await addFavorite(movieSlug);
      return true;
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return false;
  }
}

export async function isFavorite(movieSlug: string): Promise<boolean> {
  try {
    const favorites = await getFavorites();
    return favorites.includes(movieSlug);
  } catch (error) {
    console.error('Error checking favorite:', error);
    return false;
  }
}
