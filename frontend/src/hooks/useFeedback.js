import { supabase } from "../lib/supabaseClient";

export function useFeedback(user) {
  async function submitFeedback({ item, vote, predictionId, comment }) {
    if (!user) {
      throw new Error("You must be logged in to give feedback.");
    }

    if (!item?.slug) {
      throw new Error("Missing glasses item.");
    }

    if (!["like", "dislike"].includes(vote)) {
      throw new Error("Feedback vote must be like or dislike.");
    }

    const { error } = await supabase.from("feedback").insert({
      user_id: user.id,
      prediction_id: predictionId || null,
      glasses_slug: item.slug,
      vote,
      comment: comment || null,
    });

    if (error) throw error;
  }

  return {
    submitFeedback,
  };
}