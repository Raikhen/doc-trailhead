<!DOCTYPE html>
<html lang=en>
<title>Trips - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/static/css/common.css">
<link rel="stylesheet" href="/static/css/all-trips.css">
<script src="/htmx/htmx.js"></script>

{% include "common/site-nav.njs" %}
<main>

<section class="info-card">
<img src="/static/icons/mountain-icon.svg">
<h1>Explore Trips</h1>
</section>

<section class="trips" hx-get="/rest/all-trips" hx-swap=innerHTML hx-trigger=load>
</section>

</main>

