import {
  Bookmark,
  ExternalLink,
  LogIn,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

function RecommendationGrid({
  recommendations,
  user,
  predictionId,
  actionMessage,
  isFavorite,
  onRequireLogin,
  onBlockedAction,
  onSaveFavorite,
  onFeedback,
}) {
  if (!recommendations || !recommendations.items?.length) return null;

  const blockedReason = !user
    ? "Log in to save frames or give feedback."
    : !predictionId
    ? "This analysis was not saved because you already have 3 saved profiles. Delete one saved profile and run a new scan if you want to save these frames."
    : "";

  return (
    <section className="recommendation-section">
      <div className="recommendation-heading">
        <div>
          <p className="eyebrow">Eyewear recommendations</p>
          <h2>Best matches for {recommendations.dominantShape}</h2>

          <p>
            Showing 5 main models for your dominant face shape
            {recommendations.secondaryShape
              ? `, plus a secondary match for ${recommendations.secondaryShape} if available.`
              : "."}
          </p>
        </div>

        {!user && (
          <button className="login-btn dark" onClick={onRequireLogin}>
            <LogIn size={16} />
            Login to save
          </button>
        )}
      </div>

      {blockedReason && user && (
        <div className="limit-warning">{blockedReason}</div>
      )}

      {actionMessage && <div className="action-message">{actionMessage}</div>}

      <div className="glasses-grid">
        {recommendations.items.map((item) => (
          <GlassesCard
            key={item.slug}
            item={item}
            user={user}
            predictionId={predictionId}
            saved={isFavorite(item.slug, predictionId)}
            blockedReason={blockedReason}
            onRequireLogin={onRequireLogin}
            onBlockedAction={onBlockedAction}
            onSaveFavorite={onSaveFavorite}
            onFeedback={onFeedback}
          />
        ))}
      </div>
    </section>
  );
}

function GlassesCard({
  item,
  user,
  predictionId,
  saved,
  blockedReason,
  onRequireLogin,
  onBlockedAction,
  onSaveFavorite,
  onFeedback,
}) {
  function handleSave() {
    if (!user) {
      onRequireLogin("Log in to save favorite glasses.");
      return;
    }

    if (!predictionId) {
      onBlockedAction(blockedReason);
      return;
    }

    onSaveFavorite(item);
  }

  function handleVote(vote) {
    if (!user) {
      onRequireLogin("Log in to like or dislike recommendations.");
      return;
    }

    if (!predictionId) {
      onBlockedAction(blockedReason);
      return;
    }

    const comment = window.prompt(
      `Optional comment for ${item.name}. Leave empty if you only want to ${vote}.`
    );

    onFeedback(item, vote, comment || "");
  }

  return (
    <article className="glasses-card">
      <div className="glasses-image-wrap">
        <img src={item.image} alt={item.name} />
      </div>

      <div className="glasses-content">
        <p className="eyebrow">{item.recommendationType}</p>

        <h3>{item.name}</h3>

        <p>{item.reason}</p>

        <small>
          AI-generated image. {item.inspiredBy}. For exact products, visit the
          official store.
        </small>

        <div className="glasses-actions">
          <button className="mini-btn" onClick={handleSave}>
            <Bookmark size={16} />
            {saved ? "Saved" : "Save"}
          </button>

          <button className="mini-btn" onClick={() => handleVote("like")}>
            <ThumbsUp size={16} />
          </button>

          <button className="mini-btn" onClick={() => handleVote("dislike")}>
            <ThumbsDown size={16} />
          </button>

          <a
            className="mini-btn link-btn"
            href={item.officialUrl}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={16} />
            Store
          </a>
        </div>
      </div>
    </article>
  );
}

export default RecommendationGrid;