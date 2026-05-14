import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useFavorites(user) {
  const [favorites, setFavorites] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }

    setFavoritesLoading(true);

    const { data, error } = await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load favorites:", error);
      setFavoritesLoading(false);
      return;
    }

    setFavorites(data || []);
    setFavoritesLoading(false);
  }, [user]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  function isFavorite(slug, predictionId) {
    return favorites.some(
      (fav) =>
        fav.glasses_slug === slug &&
        (!predictionId || fav.prediction_id === predictionId)
    );
  }

  async function saveFavorite(item, context = {}) {
    if (!user) {
      throw new Error("You must be logged in to save favorites.");
    }

    if (!context.predictionId) {
      throw new Error(
        "This analysis was not saved as a profile, so frames from it cannot be saved. Delete one saved profile and run a new scan if you want to save these recommendations."
      );
    }

    const { error } = await supabase.from("favorites").upsert(
      {
        user_id: user.id,
        prediction_id: context.predictionId,
        glasses_slug: item.slug,
        glasses_name: item.name,
        face_shape: context.faceShape || null,
        category: item.recommendationType || null,
        official_url: item.officialUrl || null,
      },
      {
        onConflict: "user_id,prediction_id,glasses_slug",
      }
    );

    if (error) throw error;

    await loadFavorites();
  }

  return {
    favorites,
    favoritesLoading,
    loadFavorites,
    isFavorite,
    saveFavorite,
  };
}