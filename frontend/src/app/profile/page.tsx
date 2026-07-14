"use client";

import { useState } from "react";

export default function ProfilePage() {
  // Profile state
  const [name, setName] = useState("Admin");
  const [email, setEmail] = useState("admin@fmcg360.com");
  const [role] = useState("Super Admin");

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setTimeout(() => {
      setSavingProfile(false);
      setSuccess("Profile information saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
    }, 800);
  };

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    setError(null);
    setTimeout(() => {
      setSavingPassword(false);
      setSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(null), 3000);
    }, 1000);
  };

  return (
    <div className="container stack" style={{ gap: "2rem" }}>
      <header className="hero">
        <h1>Profile</h1>
        <p>Manage your account settings and credentials.</p>
      </header>

      {success && (
        <div className="success-box">
          {success}
        </div>
      )}

      {error && (
        <div className="error-box">
          <span className="error-text"><strong>Error:</strong> {error}</span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }} className="detail-grid">
        
        {/* Profile Card (Matches Screen 10 Left) */}
        <section className="card stack" style={{ gap: "1.5rem" }}>
          <h2>Profile Information</h2>
          
          <form onSubmit={handleProfileSave} className="stack" style={{ gap: "1.25rem" }}>
            <div className="profile-avatar-sec">
              <div className="profile-circle">
                A
              </div>
              <button type="button" className="small button-secondary" style={{ border: "none", color: "var(--accent-primary)", padding: "0.25rem 0.5rem" }}>
                Change Avatar
              </button>
            </div>

            <label>
              Name
              <input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </label>

            <label>
              Email
              <input 
                type="email"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </label>

            <label>
              Role
              <input 
                value={role} 
                disabled 
                style={{ background: "var(--bg)", cursor: "not-allowed", color: "var(--text-secondary)" }}
              />
            </label>

            <button type="submit" disabled={savingProfile} style={{ alignSelf: "flex-start" }}>
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </section>

        {/* Password Card (Matches Screen 10 Right) */}
        <section className="card stack" style={{ gap: "1.5rem" }}>
          <h2>Change Password</h2>
          
          <form onSubmit={handlePasswordSave} className="stack" style={{ gap: "1.25rem" }}>
            <label>
              Current Password
              <input 
                type="password"
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                placeholder="••••••••"
                required 
              />
            </label>

            <label>
              New Password
              <input 
                type="password"
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="Min 8 characters"
                required 
              />
            </label>

            <label>
              Confirm Password
              <input 
                type="password"
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="Re-type new password"
                required 
              />
            </label>

            <button type="submit" disabled={savingPassword} style={{ alignSelf: "flex-start", background: "var(--accent-secondary)" }}>
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </section>

      </div>
    </div>
  );
}
