export function ChartCard({ title, subtitle, children, actions }) {
  return (
    <section className="chart-card">
      <header className="chart-card__head">
        <div>
          <h3 className="chart-card__title">{title}</h3>
          {subtitle ? <p className="chart-card__subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="chart-card__actions">{actions}</div> : null}
      </header>
      <div className="chart-card__body">{children}</div>
    </section>
  );
}
