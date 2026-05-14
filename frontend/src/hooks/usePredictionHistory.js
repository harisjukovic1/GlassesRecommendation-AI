import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const MAX_SAVED_PROFILES = 3;

export function usePredictionHistory(user) {
  const [profiles, setProfiles] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(false);

  const loadProfiles = useCallback(async () => {
    if (!user) {
      setProfiles([]);
      return;
    }

    setProfilesLoading(true);

    const { data, error } = await supabase
      .from("prediction_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load prediction profiles:", error);
      setProfilesLoading(false);
      return;
    }

    setProfiles(data || []);
    setProfilesLoading(false);
  }, [user]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const profileCount = profiles.length;
  const canSaveNewProfile = Boolean(user) && profileCount < MAX_SAVED_PROFILES;

  async function savePrediction(predictionResult) {
    if (!user) {
      return {
        saved: false,
        id: null,
        reason: "User is not logged in.",
      };
    }

    if (profiles.length >= MAX_SAVED_PROFILES) {
      return {
        saved: false,
        id: null,
        reason:
          "You already have 3 saved analysis profiles. This scan can still run, but it will not be saved. Delete one profile if you want to save a new one.",
      };
    }

    const { data, error } = await supabase
      .from("prediction_history")
      .insert({
        user_id: user.id,
        face_shape: predictionResult.face_shape,
        confidence_percent: predictionResult.confidence_percent,
        probabilities: predictionResult.probabilities_percent || {},
      })
      .select("id")
      .single();

    if (error) {
      console.error("Could not save prediction profile:", error);

      return {
        saved: false,
        id: null,
        reason:
          error.message ||
          "Scan finished, but the prediction profile could not be saved.",
      };
    }

    await loadProfiles();

    return {
      saved: true,
      id: data.id,
      reason: "Prediction profile saved.",
    };
  }

  async function deleteProfile(profileId) {
    if (!user || !profileId) return;

    const { error } = await supabase
      .from("prediction_history")
      .delete()
      .eq("id", profileId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Could not delete profile:", error);
      throw error;
    }

    await loadProfiles();
  }

  return {
    profiles,
    profilesLoading,
    profileCount,
    maxProfiles: MAX_SAVED_PROFILES,
    canSaveNewProfile,
    loadProfiles,
    savePrediction,
    deleteProfile,
  };
}