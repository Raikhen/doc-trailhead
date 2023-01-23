<!DOCTYPE html>
<html lang=en>
<title>Home - DOC Trailhead</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/static/css/common.css">
<link rel="stylesheet" href="/static/css/trip-form.css">
<script src="/htmx/htmx.js"></script>

{% include "common/site-nav.njs" %}

<main>
<a href="/my-trips" class=top-link>Back to trips page</a>
{% include "trip/trip-form.njs" %}
</main>
