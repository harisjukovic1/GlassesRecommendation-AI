import { useEffect, useMemo, useState } from "react";
import { X, Trash2, UserRound, Bookmark, CalendarDays } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { GLASSES } from "../data/glassesCatalog";

function ProfileDrawer({
  open,
  onClose,
  user,
  profiles,
  profilesLoading,
  maxProfiles,
  onDeleteProfile,
}) {
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [savedFrames, setSavedFrames] = useState([]);
  const [framesLoading, setFramesLoading] = useState(false);
  const [drawerMessage, setDrawerMessage] = useState("");

  const selectedProfile = useMemo(() => {
    return profiles.find((profile) => profile.id === selectedProfileId) || null;
  }, [profiles, selectedProfileId]);

  useEffect(() => {
    if (open && profiles.length > 0 && !selectedProfileId) {
      setSelectedProfileId(profiles[0].id);
    }

    if (open && profiles.length === 0) {
      setSelectedProfileId(null);
      setSavedFrames([]);
    }
  }, [open, profiles, selectedProfileId]);

  useEffect(() => {
    if (!open || !user || !selectedProfileId) {
      setSavedFrames([]);
      return;
    }

    async function loadSavedFrames() {
      setFramesLoading(true);
      setDrawerMessage("");

      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", user.id)
        .eq("prediction_id", selectedProfileId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Could not load saved frames:", error);
        setDrawerMessage("Could not load saved frames.");
        setFramesLoading(false);
        return;
      }

      setSavedFrames(data || []);
      setFramesLoading(false);
    }

    loadSavedFrames();
  }, [open, user, selectedProfileId]);

  if (!open) return null;

  async function handleDeleteProfile(profileId) {
    const confirmed = window.confirm(
      "Delete this saved profile? Its saved frames will also be removed."
    );

    if (!confirmed) return;

    try {
      await onDeleteProfile(profileId);
      setDrawerMessage("Profile deleted.");

      const remainingProfiles = profiles.filter(
        (profile) => profile.id !== profileId
      );

      setSelectedProfileId(remainingProfiles[0]?.id || null);
    } catch {
      setDrawerMessage("Could not delete profile.");
    }
  }

  function formatDate(value) {
    if (!value) return "Unknown date";

    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="drawer-overlay">
      <aside className="profile-drawer">
        <div className="drawer-top">
          <div>
            <p className="eyebrow">Account</p>
            <h2>My Profiles</h2>
            <p>
              You can save up to {maxProfiles} prediction profiles. Delete one
              if you want to save a new scan.
            </p>
          </div>

          <button className="icon-btn" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        {drawerMessage && <div className="action-message">{drawerMessage}</div>}

        <div className="drawer-layout">
          <div className="profile-list">
            <div className="profile-count-card">
              <UserRound size={18} />
              <span>
                {profiles.length}/{maxProfiles} saved profiles
              </span>
            </div>

            {profilesLoading && <p className="drawer-muted">Loading profiles...</p>}

            {!profilesLoading && profiles.length === 0 && (
              <div className="empty-drawer-card">
                <h3>No saved profiles yet</h3>
                <p>
                  Run a scan while logged in to save your first prediction
                  profile.
                </p>
              </div>
            )}

            {profiles.map((profile, index) => (
              <button
                key={profile.id}
                className={
                  selectedProfileId === profile.id
                    ? "profile-list-item active"
                    : "profile-list-item"
                }
                onClick={() => setSelectedProfileId(profile.id)}
              >
                <div>
                  <strong>Profile {profiles.length - index}</strong>
                  <span>{profile.face_shape}</span>
                </div>

                <small>{Number(profile.confidence_percent || 0).toFixed(2)}%</small>
              </button>
            ))}
          </div>

          <div className="profile-detail">
            {!selectedProfile && (
              <div className="empty-drawer-card">
                <h3>Select a profile</h3>
                <p>Your saved scan details will appear here.</p>
              </div>
            )}

            {selectedProfile && (
              <>
                <div className="profile-detail-head">
                  <div>
                    <p className="eyebrow">Saved analysis</p>
                    <h3>{selectedProfile.face_shape}</h3>

                    <p>
                      Confidence:{" "}
                      <strong>
                        {Number(selectedProfile.confidence_percent || 0).toFixed(2)}%
                      </strong>
                    </p>

                    <span>
                      <CalendarDays size={15} />
                      {formatDate(selectedProfile.created_at)}
                    </span>
                  </div>

                  <button
                    className="danger-btn"
                    onClick={() => handleDeleteProfile(selectedProfile.id)}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>

                <div className="probability-mini-list">
                  {selectedProfile.probabilities &&
                    Object.entries(selectedProfile.probabilities).map(
                      ([shape, value]) => (
                        <div key={shape} className="mini-prob-row">
                          <span>{shape}</span>
                          <strong>{Number(value || 0).toFixed(2)}%</strong>
                        </div>
                      )
                    )}
                </div>

                <div className="saved-frames-section">
                  <h4>
                    <Bookmark size={17} />
                    Saved frames
                  </h4>

                  {framesLoading && (
                    <p className="drawer-muted">Loading saved frames...</p>
                  )}

                  {!framesLoading && savedFrames.length === 0 && (
                    <p className="drawer-muted">
                      No frames saved for this profile yet.
                    </p>
                  )}

                  <div className="saved-frame-list">
                    {savedFrames.map((frame) => {
                      const catalogItem = GLASSES[frame.glasses_slug];

                      return (
                        <article className="saved-frame-card" key={frame.id}>
                          {catalogItem?.image && (
                            <img src={catalogItem.image} alt={frame.glasses_name} />
                          )}

                          <div>
                            <strong>{frame.glasses_name}</strong>
                            <span>{frame.category}</span>

                            {frame.official_url && (
                              <a
                                href={frame.official_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Official store
                              </a>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

export default ProfileDrawer;