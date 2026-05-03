import { useState, useRef, ChangeEvent, DragEvent, ReactNode, CSSProperties } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PrefillData {
  name?: string;
  phone?: string;
  city?: string;          // accepts "Akron, OH" — split on submit
  category?: string;      // raw category string from Google Places
}

export interface PhotoEntry {
  id: string;
  file: File;
  name: string;
  size: number;
  preview: string;        // object URL
  caption: string;
}

export interface OnboardingData {
  businessName: string;
  ownerName: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  category: string;
  categoryOther: string;
  yearsInBusiness: string;
  serviceType: string;
  goals: string[];
  wantsBooking: string;
  inspiration: string;
  description: string;
  services: string;
  promo: string;
  testimonial: string;
  address: string;
  openDays: string[];
  openTime: string;
  closeTime: string;
  social: string;
  notes: string;
  photos: PhotoEntry[];
}

export interface OnboardingFormProps {
  /** Optional prefill data from a Google Maps prospect */
  prefillData?: PrefillData | null;
  /** API endpoint to POST the form to. Default: "/api/onboard" */
  apiEndpoint?: string;
  /** Optional callback after a successful submission */
  onSuccess?: (data: OnboardingData) => void;
  /** Optional callback when submission fails */
  onError?: (error: Error) => void;
}

type Errors = Partial<Record<keyof OnboardingData, string>>;

interface StepConfig {
  id: "basics" | "category" | "goals" | "details" | "contact" | "photos" | "review";
  title: string;
  subtitle: string;
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg: "#faf8f5",
  surface: "#ffffff",
  border: "#e8e2d9",
  borderFocus: "#2d6a4f",
  text: "#1a1a18",
  muted: "#6b6860",
  accent: "#2d6a4f",
  accentLight: "#e8f4ee",
  accentHover: "#235540",
  warn: "#c0392b",
  step: "#b5cfc3",
} as const;

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');`;

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: "restaurant", label: "Restaurant / Cafe", icon: "🍽️" },
  { id: "retail", label: "Retail Shop", icon: "🛍️" },
  { id: "salon", label: "Salon / Spa", icon: "✂️" },
  { id: "contractor", label: "Contractor / Trades", icon: "🔧" },
  { id: "medical", label: "Medical / Dental", icon: "🏥" },
  { id: "fitness", label: "Fitness / Wellness", icon: "💪" },
  { id: "auto", label: "Auto Service", icon: "🚗" },
  { id: "legal", label: "Legal / Financial", icon: "⚖️" },
  { id: "cleaning", label: "Cleaning Service", icon: "🧹" },
  { id: "other", label: "Other", icon: "📋" },
];

const GOALS: { id: string; label: string }[] = [
  { id: "calls", label: "Get more phone calls" },
  { id: "directions", label: "Drive foot traffic" },
  { id: "bookings", label: "Accept bookings online" },
  { id: "showcase", label: "Showcase my work" },
  { id: "credibility", label: "Look more professional" },
  { id: "hours", label: "Share hours & location" },
];

const HOURS_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STEPS: StepConfig[] = [
  { id: "basics",   title: "Your Business",   subtitle: "Let's start with the essentials" },
  { id: "category", title: "What You Do",     subtitle: "Help us understand your business" },
  { id: "goals",    title: "Your Goals",      subtitle: "What matters most to you online?" },
  { id: "details",  title: "Tell Your Story", subtitle: "Help customers know & trust you" },
  { id: "contact",  title: "Hours & Contact", subtitle: "How customers can reach you" },
  { id: "photos",   title: "Photos",          subtitle: "Add up to 20 images for your site" },
  { id: "review",   title: "Almost Done",     subtitle: "Review and submit" },
];

const MAX_PHOTOS = 20;
const MAX_PHOTO_SIZE_MB = 8;

// ── Helpers ───────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

function Field({ label, hint, error, children }: FieldProps) {
  return (
    <div style={{ marginBottom: 22 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6, fontFamily: "'DM Sans', sans-serif", letterSpacing: ".01em" }}>
        {label}
      </label>
      {hint && <p style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontFamily: "'DM Sans', sans-serif" }}>{hint}</p>}
      {children}
      {error && <p style={{ fontSize: 12, color: C.warn, marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>{error}</p>}
    </div>
  );
}

const inputStyle = (focused: boolean): CSSProperties => ({
  width: "100%",
  padding: "11px 14px",
  border: `1.5px solid ${focused ? C.borderFocus : C.border}`,
  borderRadius: 8,
  fontSize: 15,
  fontFamily: "'DM Sans', sans-serif",
  color: C.text,
  background: C.surface,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color .15s",
  boxShadow: focused ? `0 0 0 3px ${C.accentLight}` : "none",
});

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}

function Input({ value, onChange, placeholder, type = "text", maxLength }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      style={inputStyle(focused)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

interface TextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

function Textarea({ value, onChange, placeholder, rows = 4 }: TextareaProps) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{ ...inputStyle(focused), resize: "vertical", lineHeight: 1.6 }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

interface ChipProps {
  label: string;
  icon?: string;
  selected: boolean;
  onClick: () => void;
}

function Chip({ label, icon, selected, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "9px 16px",
        border: `1.5px solid ${selected ? C.borderFocus : C.border}`,
        borderRadius: 100,
        background: selected ? C.accentLight : C.surface,
        color: selected ? C.accent : C.muted,
        fontSize: 13,
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: selected ? 500 : 400,
        cursor: "pointer",
        transition: "all .15s",
      }}
    >
      {icon && <span>{icon}</span>}
      {label}
      {selected && <span style={{ color: C.accent, fontSize: 12, marginLeft: 2 }}>✓</span>}
    </button>
  );
}

interface CategoryCardProps {
  item: { id: string; label: string; icon: string };
  selected: boolean;
  onClick: () => void;
}

function CategoryCard({ item, selected, onClick }: CategoryCardProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "16px 12px",
        border: `1.5px solid ${selected ? C.borderFocus : C.border}`,
        borderRadius: 12,
        background: selected ? C.accentLight : C.surface,
        cursor: "pointer",
        transition: "all .15s",
        boxShadow: selected ? `0 0 0 3px ${C.accentLight}` : "none",
      }}
    >
      <span style={{ fontSize: 26 }}>{item.icon}</span>
      <span style={{ fontSize: 12, color: selected ? C.accent : C.muted, fontFamily: "'DM Sans', sans-serif", fontWeight: selected ? 500 : 400, textAlign: "center", lineHeight: 1.3 }}>
        {item.label}
      </span>
    </button>
  );
}

// ── Step components ───────────────────────────────────────────────────────────

type UpdateFn = <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => void;

interface StepProps {
  data: OnboardingData;
  update: UpdateFn;
  errors: Errors;
}

function StepBasics({ data, update, errors }: StepProps) {
  return (
    <div>
      <Field label="Business Name *" error={errors.businessName}>
        <Input value={data.businessName} onChange={(v) => update("businessName", v)} placeholder="e.g. Rivera's Auto Repair" />
      </Field>
      <Field label="Your Name *" error={errors.ownerName}>
        <Input value={data.ownerName} onChange={(v) => update("ownerName", v)} placeholder="First and last name" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="City *" error={errors.city}>
          <Input value={data.city} onChange={(v) => update("city", v)} placeholder="e.g. Akron" />
        </Field>
        <Field label="State *" error={errors.state}>
          <Input value={data.state} onChange={(v) => update("state", v)} placeholder="OH" maxLength={2} />
        </Field>
      </div>
      <Field label="Phone Number *" error={errors.phone}>
        <Input value={data.phone} onChange={(v) => update("phone", v)} placeholder="(555) 123-4567" type="tel" />
      </Field>
      <Field label="Email Address" hint="Where we'll send your site preview">
        <Input value={data.email} onChange={(v) => update("email", v)} placeholder="you@example.com" type="email" />
      </Field>
    </div>
  );
}

function StepCategory({ data, update }: StepProps) {
  return (
    <div>
      <Field label="What type of business do you run? *">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10, marginTop: 4 }}>
          {CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.id}
              item={cat}
              selected={data.category === cat.id}
              onClick={() => update("category", cat.id)}
            />
          ))}
        </div>
      </Field>
      {data.category === "other" && (
        <Field label="Describe your business type">
          <Input value={data.categoryOther} onChange={(v) => update("categoryOther", v)} placeholder="e.g. Pet grooming" />
        </Field>
      )}
      <Field label="How long have you been in business?">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {["Less than 1 year", "1-3 years", "3-10 years", "10+ years"].map((opt) => (
            <Chip key={opt} label={opt} selected={data.yearsInBusiness === opt} onClick={() => update("yearsInBusiness", opt)} />
          ))}
        </div>
      </Field>
      <Field label="Do you serve customers at a physical location?">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Yes - customers come to me", "I go to customers", "Both", "Online only"].map((opt) => (
            <Chip key={opt} label={opt} selected={data.serviceType === opt} onClick={() => update("serviceType", opt)} />
          ))}
        </div>
      </Field>
    </div>
  );
}

function StepGoals({ data, update }: StepProps) {
  const toggleGoal = (id: string) => {
    const goals = data.goals;
    update("goals", goals.includes(id) ? goals.filter((g) => g !== id) : [...goals, id]);
  };
  return (
    <div>
      <Field label="What do you most want your website to do? *" hint="Choose all that apply">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
          {GOALS.map((g) => (
            <Chip key={g.id} label={g.label} selected={data.goals.includes(g.id)} onClick={() => toggleGoal(g.id)} />
          ))}
        </div>
      </Field>
      <Field label="Do you want customers to book or request appointments online?">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Yes, definitely", "Maybe later", "No thanks"].map((opt) => (
            <Chip key={opt} label={opt} selected={data.wantsBooking === opt} onClick={() => update("wantsBooking", opt)} />
          ))}
        </div>
      </Field>
      <Field label="Any competitors or local businesses whose websites you admire?" hint="Optional - share a URL or just a name">
        <Input value={data.inspiration} onChange={(v) => update("inspiration", v)} placeholder="e.g. BestPlumber.com or 'Mike's HVAC on Main St'" />
      </Field>
    </div>
  );
}

function StepDetails({ data, update, errors }: StepProps) {
  return (
    <div>
      <Field label="Describe your business in a few sentences *" hint="What do you do? Who do you help? What makes you different?" error={errors.description}>
        <Textarea
          value={data.description}
          onChange={(v) => update("description", v)}
          placeholder="e.g. We've been fixing cars in Akron for 22 years. Family owned and operated - we treat every customer like a neighbor."
          rows={5}
        />
      </Field>
      <Field label="List your main services or products" hint="One per line, or comma-separated">
        <Textarea
          value={data.services}
          onChange={(v) => update("services", v)}
          placeholder={"Oil changes\nBrake repair\nEngine diagnostics\nTire rotation"}
          rows={4}
        />
      </Field>
      <Field label="Do you have any special offers or promotions?" hint="Optional - great for getting new customers">
        <Input value={data.promo} onChange={(v) => update("promo", v)} placeholder="e.g. 10% off first visit, free estimate" />
      </Field>
      <Field label="What do your customers say about you?" hint="Paste a favorite review, or describe what customers love">
        <Textarea
          value={data.testimonial}
          onChange={(v) => update("testimonial", v)}
          placeholder="e.g. 'Honest, fast, and fair priced. Best mechanic in town.' - Google Review"
          rows={3}
        />
      </Field>
    </div>
  );
}

function StepContact({ data, update }: StepProps) {
  const toggleDay = (day: string) => {
    const open = data.openDays;
    update("openDays", open.includes(day) ? open.filter((d) => d !== day) : [...open, day]);
  };
  return (
    <div>
      <Field label="Street Address" hint="Displayed on your website - leave blank if you prefer not to show it">
        <Input value={data.address} onChange={(v) => update("address", v)} placeholder="123 Main Street" />
      </Field>
      <Field label="Which days are you open?">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
          {HOURS_DAYS.map((day) => (
            <Chip key={day} label={day} selected={data.openDays.includes(day)} onClick={() => toggleDay(day)} />
          ))}
        </div>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Field label="Opening Time">
          <Input value={data.openTime} onChange={(v) => update("openTime", v)} placeholder="8:00 AM" />
        </Field>
        <Field label="Closing Time">
          <Input value={data.closeTime} onChange={(v) => update("closeTime", v)} placeholder="6:00 PM" />
        </Field>
      </div>
      <Field label="Facebook or Instagram page" hint="Optional - we'll link it on your site">
        <Input value={data.social} onChange={(v) => update("social", v)} placeholder="facebook.com/yourbusiness" />
      </Field>
      <Field label="Anything else we should know?" hint="Special instructions, notes for your site, questions for us">
        <Textarea value={data.notes} onChange={(v) => update("notes", v)} placeholder="e.g. We're closed every other Saturday. Our logo is blue and gold." rows={3} />
      </Field>
    </div>
  );
}

function StepPhotos({ data, update }: StepProps) {
  const photos = data.photos;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setError("");
    const files = Array.from(fileList);
    const remaining = MAX_PHOTOS - photos.length;
    if (files.length > remaining) {
      setError(`You can only add ${remaining} more photo${remaining === 1 ? "" : "s"} (limit ${MAX_PHOTOS}).`);
    }

    const accepted: PhotoEntry[] = [];
    for (const file of files.slice(0, remaining)) {
      if (!file.type.startsWith("image/")) {
        setError(`"${file.name}" isn't an image - skipped.`);
        continue;
      }
      if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
        setError(`"${file.name}" is over ${MAX_PHOTO_SIZE_MB}MB - skipped.`);
        continue;
      }
      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        name: file.name,
        size: file.size,
        preview: URL.createObjectURL(file),
        caption: "",
      });
    }
    if (accepted.length) update("photos", [...photos, ...accepted]);
  };

  const remove = (id: string) => {
    const photo = photos.find((p) => p.id === id);
    if (photo?.preview) URL.revokeObjectURL(photo.preview);
    update("photos", photos.filter((p) => p.id !== id));
  };

  const setCaption = (id: string, caption: string) => {
    update("photos", photos.map((p) => (p.id === id ? { ...p, caption } : p)));
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div style={{
        background: C.accentLight,
        border: `1px solid ${C.borderFocus}33`,
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 20,
      }}>
        <p style={{ fontSize: 13, color: C.accent, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
          📷 Photos are <strong>optional</strong> but make a huge difference. Upload pictures of your team, location, work, or products. We'll choose the best ones for your site.
        </p>
      </div>

      <div
        onClick={() => photos.length < MAX_PHOTOS && fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragOver ? C.borderFocus : C.border}`,
          background: dragOver ? C.accentLight : C.surface,
          borderRadius: 12,
          padding: "32px 20px",
          textAlign: "center",
          cursor: photos.length < MAX_PHOTOS ? "pointer" : "not-allowed",
          transition: "all .15s",
          marginBottom: 16,
          opacity: photos.length >= MAX_PHOTOS ? 0.5 : 1,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
        <p style={{ fontSize: 14, color: C.text, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, marginBottom: 4 }}>
          {photos.length >= MAX_PHOTOS
            ? `Maximum ${MAX_PHOTOS} photos reached`
            : "Tap to choose photos, or drag them here"}
        </p>
        <p style={{ fontSize: 12, color: C.muted, fontFamily: "'DM Sans', sans-serif" }}>
          {photos.length} of {MAX_PHOTOS} added · JPG, PNG, HEIC · up to {MAX_PHOTO_SIZE_MB}MB each
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
          style={{ display: "none" }}
        />
      </div>

      {error && (
        <div style={{
          background: "#fdf2f2",
          border: `1px solid ${C.warn}44`,
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 16,
        }}>
          <p style={{ fontSize: 12, color: C.warn, fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
        </div>
      )}

      {photos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
          {photos.map((p) => (
            <div key={p.id} style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              overflow: "hidden",
            }}>
              <div style={{
                width: "100%",
                aspectRatio: "1 / 1",
                background: `url(${p.preview}) center / cover no-repeat`,
                position: "relative",
              }}>
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "#000c",
                    border: "none",
                    color: "#fff",
                    fontSize: 14,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
              <div style={{ padding: 8 }}>
                <input
                  type="text"
                  value={p.caption}
                  onChange={(e) => setCaption(p.id, e.target.value)}
                  placeholder="Add caption (optional)"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "none",
                    outline: "none",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    color: C.text,
                    background: "transparent",
                  }}
                />
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2, fontFamily: "'DM Sans', sans-serif" }}>
                  {formatSize(p.size)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ReviewRowProps {
  label: string;
  value: string | string[] | null | undefined;
}

function ReviewRow({ label, value }: ReviewRowProps) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  const display = Array.isArray(value) ? value.join(", ") : value;
  return (
    <div style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 13, color: C.muted, fontFamily: "'DM Sans', sans-serif", minWidth: 140, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: C.text, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>{display}</span>
    </div>
  );
}

function StepReview({ data }: { data: OnboardingData }) {
  const catLabel = CATEGORIES.find((c) => c.id === data.category)?.label || data.category;
  const goalLabels = data.goals
    .map((g) => GOALS.find((x) => x.id === g)?.label)
    .filter((label): label is string => Boolean(label));
  const dayLabels = data.openDays;
  const hours = [data.openTime, data.closeTime].filter(Boolean).join(" - ");

  return (
    <div>
      <div style={{ background: C.accentLight, border: `1px solid ${C.borderFocus}33`, borderRadius: 10, padding: "14px 18px", marginBottom: 22 }}>
        <p style={{ fontSize: 13, color: C.accent, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
          ✓ You're almost done! Review your details below, then hit <strong>Submit</strong>. We'll start building your site and send a preview to your email.
        </p>
      </div>
      <div>
        <ReviewRow label="Business Name" value={data.businessName} />
        <ReviewRow label="Owner" value={data.ownerName} />
        <ReviewRow label="Location" value={[data.city, data.state].filter(Boolean).join(", ")} />
        <ReviewRow label="Phone" value={data.phone} />
        <ReviewRow label="Email" value={data.email} />
        <ReviewRow label="Category" value={catLabel} />
        <ReviewRow label="Years in Business" value={data.yearsInBusiness} />
        <ReviewRow label="Service Type" value={data.serviceType} />
        <ReviewRow label="Goals" value={goalLabels} />
        <ReviewRow label="Wants Booking" value={data.wantsBooking} />
        <ReviewRow label="Description" value={data.description} />
        <ReviewRow label="Services" value={data.services} />
        <ReviewRow label="Promo" value={data.promo} />
        <ReviewRow label="Open Days" value={dayLabels} />
        <ReviewRow label="Hours" value={hours} />
        <ReviewRow label="Address" value={data.address} />
        <ReviewRow label="Social" value={data.social} />
        <ReviewRow label="Notes" value={data.notes} />
        <ReviewRow label="Photos" value={data.photos.length ? `${data.photos.length} photo${data.photos.length === 1 ? "" : "s"} attached` : ""} />
      </div>
    </div>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────

function validate(stepId: StepConfig["id"], data: OnboardingData): Errors {
  const errors: Errors = {};
  if (stepId === "basics") {
    if (!data.businessName.trim()) errors.businessName = "Business name is required";
    if (!data.ownerName.trim()) errors.ownerName = "Your name is required";
    if (!data.city.trim()) errors.city = "City is required";
    if (!data.state.trim()) errors.state = "State is required";
    if (!data.phone.trim()) errors.phone = "Phone number is required";
  }
  if (stepId === "category") {
    if (!data.category) errors.category = "Please select a category";
  }
  if (stepId === "goals") {
    if (!data.goals.length) errors.goals = "Please select at least one goal";
  }
  if (stepId === "details") {
    if (!data.description.trim()) errors.description = "Please describe your business";
  }
  return errors;
}

// ── Category mapping (Google Places → form category) ─────────────────────────

function mapCategory(raw: string): string {
  const r = raw.toLowerCase();
  if (r.includes("restaurant") || r.includes("café") || r.includes("cafe") || r.includes("bakery")) return "restaurant";
  if (r.includes("auto") || r.includes("repair") || r.includes("mechanic")) return "auto";
  if (r.includes("salon") || r.includes("barber") || r.includes("spa")) return "salon";
  if (r.includes("plumb") || r.includes("hvac") || r.includes("electric") || r.includes("landscap")) return "contractor";
  if (r.includes("clean")) return "cleaning";
  if (r.includes("dental") || r.includes("doctor") || r.includes("medical")) return "medical";
  return "";
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OnboardingForm({
  prefillData = null,
  apiEndpoint = "/api/onboard",
  onSuccess,
  onError,
}: OnboardingFormProps) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(() => ({
    businessName: prefillData?.name || "",
    phone: prefillData?.phone || "",
    city: prefillData?.city?.split(",")[0]?.trim() || "",
    state: prefillData?.city?.split(",")[1]?.trim() || "",
    ownerName: "",
    email: "",
    category: prefillData?.category ? mapCategory(prefillData.category) : "",
    categoryOther: "",
    yearsInBusiness: "",
    serviceType: "",
    goals: [],
    wantsBooking: "",
    inspiration: "",
    description: "",
    services: "",
    promo: "",
    testimonial: "",
    address: "",
    openDays: [],
    openTime: "",
    closeTime: "",
    social: "",
    notes: "",
    photos: [],
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const topRef = useRef<HTMLDivElement>(null);

  const update: UpdateFn = (field, value) => {
    setData((d) => ({ ...d, [field]: value }));
    if (errors[field]) {
      setErrors((e) => {
        const n = { ...e };
        delete n[field];
        return n;
      });
    }
  };

  const currentStep = STEPS[step];

  const goNext = () => {
    const errs = validate(currentStep.id, data);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const goBack = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");

    try {
      const formData = new FormData();

      // Append text/scalar fields
      const textFields: (keyof OnboardingData)[] = [
        "businessName", "ownerName", "city", "state", "phone", "email",
        "category", "categoryOther", "yearsInBusiness", "serviceType",
        "wantsBooking", "inspiration", "description", "services", "promo",
        "testimonial", "address", "openTime", "closeTime", "social", "notes",
      ];
      for (const field of textFields) {
        const value = data[field];
        if (typeof value === "string") formData.append(field, value);
      }

      // Array fields as JSON
      formData.append("goals", JSON.stringify(data.goals));
      formData.append("openDays", JSON.stringify(data.openDays));

      // Photos + parallel captions array
      data.photos.forEach((p) => {
        formData.append("photos", p.file, p.name);
        formData.append("captions[]", p.caption || "");
      });

      // Don't set Content-Type — browser sets multipart boundary from FormData
      const res = await fetch(apiEndpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok && res.status !== 207) {
        const errBody = await res.text();
        throw new Error(`Submission failed (${res.status}): ${errBody || res.statusText}`);
      }

      setSubmitted(true);
      onSuccess?.(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setSubmitError(error.message);
      onError?.(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <style>{FONTS}</style>
        <div style={{ textAlign: "center", maxWidth: 480 }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>🎉</div>
          <h1 style={{ fontFamily: "'Lora', serif", fontSize: 30, color: C.text, marginBottom: 12 }}>
            We're on it, {data.ownerName.split(" ")[0]}!
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: C.muted, lineHeight: 1.7, marginBottom: 24 }}>
            Thanks for telling us about <strong>{data.businessName}</strong>. We'll start building your site right away and send a preview to <strong>{data.email || "you"}</strong> within 24-48 hours.
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: C.muted }}>
            Questions? Call or text us anytime.
          </p>
        </div>
      </div>
    );
  }

  const progress = (step / (STEPS.length - 1)) * 100;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{FONTS + `* { box-sizing: border-box; } button { cursor: pointer; } input, textarea { -webkit-appearance: none; } input::placeholder, textarea::placeholder { color: #b0aa9f; }`}</style>

      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "16px 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: C.muted }}>
              Step {step + 1} of {STEPS.length}
            </span>
            {prefillData && (
              <span style={{ fontSize: 11, background: C.accentLight, color: C.accent, padding: "3px 10px", borderRadius: 100, border: `1px solid ${C.borderFocus}44` }}>
                ✓ Pre-filled from Maps
              </span>
            )}
          </div>
          <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: C.accent, borderRadius: 2, transition: "width .4s ease" }} />
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 10, overflow: "hidden" }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i <= step ? C.accent : C.border,
                transition: "background .3s",
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 24px 120px" }} ref={topRef}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Lora', serif", fontSize: 26, fontWeight: 600, color: C.text, marginBottom: 4, lineHeight: 1.2 }}>
            {currentStep.title}
          </h1>
          <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.5 }}>{currentStep.subtitle}</p>
        </div>

        {currentStep.id === "basics"   && <StepBasics   data={data} update={update} errors={errors} />}
        {currentStep.id === "category" && <StepCategory data={data} update={update} errors={errors} />}
        {currentStep.id === "goals"    && <StepGoals    data={data} update={update} errors={errors} />}
        {currentStep.id === "details"  && <StepDetails  data={data} update={update} errors={errors} />}
        {currentStep.id === "contact"  && <StepContact  data={data} update={update} errors={errors} />}
        {currentStep.id === "photos"   && <StepPhotos   data={data} update={update} errors={errors} />}
        {currentStep.id === "review"   && <StepReview   data={data} />}

        {Object.keys(errors).length > 0 && (
          <div style={{ background: "#fdf2f2", border: `1px solid ${C.warn}44`, borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: C.warn }}>Please fill in the required fields above.</p>
          </div>
        )}

        {submitError && (
          <div style={{ background: "#fdf2f2", border: `1px solid ${C.warn}44`, borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: C.warn }}>{submitError}</p>
          </div>
        )}
      </div>

      {/* Fixed bottom nav */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: C.surface,
        borderTop: `1px solid ${C.border}`,
        padding: "16px 24px",
        zIndex: 10,
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", gap: 12 }}>
          {step > 0 && (
            <button
              type="button"
              onClick={goBack}
              disabled={submitting}
              style={{
                flex: "0 0 auto",
                padding: "13px 24px",
                border: `1.5px solid ${C.border}`,
                borderRadius: 10,
                background: C.surface,
                color: C.muted,
                fontSize: 15,
                fontFamily: "'DM Sans', sans-serif",
                opacity: submitting ? 0.5 : 1,
              }}
            >
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              style={{
                flex: 1,
                padding: "13px 24px",
                border: "none",
                borderRadius: 10,
                background: C.accent,
                color: "#fff",
                fontSize: 15,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                boxShadow: "0 2px 8px rgba(45,106,79,.35)",
                transition: "background .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.accentHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.accent)}
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                flex: 1,
                padding: "13px 24px",
                border: "none",
                borderRadius: 10,
                background: submitting ? C.muted : C.accent,
                color: "#fff",
                fontSize: 15,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                boxShadow: "0 2px 8px rgba(45,106,79,.35)",
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Submitting…" : "✓ Submit — Build My Site"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
