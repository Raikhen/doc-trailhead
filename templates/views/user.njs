<!DOCTYPE html>
<html lang=en>
<title>{{ user_name }} - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="icon" href="/static/icons/doc-icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/static/css/common.css">
<script src="/htmx/htmx.js"></script>

{% include "common/site-nav.njs" %}

<main>
<section class="info-card" hx-get="/rest/trip/{{trip_id}}/user/{{user_id}}" hx-swap=outerHTML hx-trigger=load>
</section>

</main>

