"use client";

export type AppTab = {
  id: string;
  label: string;
  count?: number;
};

type AppTabBarProps = {
  active: string;
  onChange: (tab: string) => void;
  tabs: AppTab[];
  ariaLabel?: string;
  embedded?: boolean;
};

export function AppTabBar({
  active,
  onChange,
  tabs,
  ariaLabel = "Section tabs",
  embedded = true,
}: AppTabBarProps) {
  const content = (
    <div className="app-leads-tabs !border-0 !p-0" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          data-active={active === tab.id}
          className="app-leads-tabs__btn"
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {typeof tab.count === "number" ? <span className="app-leads-tabs__count">{tab.count}</span> : null}
        </button>
      ))}
    </div>
  );

  if (!embedded) {
    return content;
  }

  return (
    <div className="app-surface app-surface--elevated overflow-hidden">
      <div className="border-b border-border/70 px-3 pt-3 sm:px-4">{content}</div>
    </div>
  );
}
