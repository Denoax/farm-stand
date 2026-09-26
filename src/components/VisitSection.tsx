export function VisitSection() {
  return (
    <section className="visit" id="visit" aria-labelledby="visit-heading">
      <div className="visit-heading">
        <p className="eyebrow">Plan a visit · fictional example</p>
        <h2 id="visit-heading">Put the practical details where people can use them.</h2>
        <p>These sample periods and access notes are not opening hours, directions, or a reservation.</p>
      </div>
      <div className="visit-details">
        <div>
          <span>01</span>
          <h3>Example stand hours</h3>
          <p>Thursday · 3–6 pm<br />Saturday · 9 am–1 pm</p>
          <small>Illustrative periods, not a live schedule.</small>
        </div>
        <div>
          <span>02</span>
          <h3>Example collection</h3>
          <p>Choose one of the sample periods while reviewing your basket.</p>
          <a href="#shop">Return to the shop</a>
        </div>
        <div>
          <span>03</span>
          <h3>Example access note</h3>
          <p>A finished site can explain parking, step-free access, gates, and weather conditions once those details are supplied.</p>
          <small>No address or geographic directions are configured.</small>
        </div>
      </div>
    </section>
  )
}
