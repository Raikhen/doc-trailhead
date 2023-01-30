<section class=info-card>
<header>Trip #{{ trip_id }}</header>
<h1>{{ title }}</h1>
<div class=status-row>
  <div class="club-tag">{{ club }}</div>
  {{ status_tag }}
  {{ full_gear_status_badge }}
</div>
<div class=button-row>
  <button id=share-link class="action edit" onclick="copyLink()">Share Link &#128279;</button>
</div>

{% if is_leader_for_trip %}
<h2>Check-In and Check-Out</h2>
<p>It is very important to alert the Outdoor Programs Office that your trip is leaving and returning
on time. 48 hours before trip-start you can begin checking out your trip.
<div class=button-row>
  <a class="action approve"
     {% if check_out_enabled %}href="/trip/{{trip_id}}/check-out"{% endif %}
     >Check-Out
  </a>
    <a
     class="action approve"
     {% if check_in_enabled %}href="/trip/{{trip_id}}/check-in"{% endif %}
     >Check-In
  </a>
</div>
{% endif %}

<h2>Description</h2>
<p>{{ description }}</p>
<a href="/trip/{{ trip_id }}">View trip signup/request gear</a>

<h2>Details</h2>
<div class=dual-table-container>
<table class=detail-table>
  <tr><th>Start<td>{{ start_time_element }}
  <tr><th>End<td>{{ end_time_element }}
  <tr><th>Pickup<td>{{ pickup }}
  <tr><th>Dropoff<td>{{ dropoff }}
  <tr><th>Destination<td>{{ location }}
</table>
<table class=detail-table>
  <tr><th>Leader<td>{{ owner_name }}
  <tr><th>Co-Leader(s)<td>{{ leader_names }}
  <tr><th>Experience needed?<td>{{ experience_needed }}
  <tr><th>Subclub<td>{{ club }}
  <tr><th>Cost<td>{{ cost }}
</table>
</div>

<h2>Approved trippes ({{ attending.length }})</h2>
<table class=trip-table>
<thead>
<tr>
  <th>Name
  <th>Attended
  <th>Allergies/Dietary Restrictions
  <th>Medical Conditions
  <th>Gear Requests
  <th>
</tr>
<tbody>
{% for member in attending %}
<tr {% if member.leader === 1%}class="leader-row"{% endif %}>
  <td><a href="/trip/{{trip_id}}/user/{{member.id}}">{{ member.name }}</a>
  <td>{{ member.attended }}
  <td>{{ member.allergies_dietary_restrictions }}
  <td>{{ member.medical_conditions }}
  <td><ul>{{ member.requested_gear }}</ul>
  <td>
    <button class="action edit"
            hx-put="/rest/trip/{{ trip_id }}/waitlist/{{ member.id }}"
            {% if member.id === owner %}disabled{% endif %}
            >Un-admit</button>
    {% if member.leader === 1 %}
    <button class="action demote"
            hx-delete="/rest/trip/{{ trip_id }}/leader/{{ member.id }}"
            {% if member.id === owner %}disabled{% endif %}
            >Make trippee
    </button>
    {% else %}
    <button class="action edit" hx-put="/rest/trip/{{ trip_id }}/leader/{{ member.id }}">Make leader</button>
    {% endif %}
</tr>
{% endfor %}
</table>
<div class=button-row>
    <button id=copy-attending-emails class="action edit" onclick="copyAttendingEmails()">Copy Emails</button>
</div>

<h2>Pending trippes ({{ pending.length }})</h2>
<table class=trip-table>
<thead>
<tr>
  <th>Name
  <th>Attended
  <th>Allergies/Dietary Restrictions
  <th>Medical Conditions
  <th>Gear Requests
  <th>
</tr>
<tbody>
{% for member in pending %}
<tr>
  <td><a href="/trip/{{trip_id}}/user/{{member.id}}">{{ member.name }}</a>
  <td>{{ member.attended }}
  <td>{{ member.allergies_dietary_restrictions }}
  <td>{{ member.medical_conditions }}
  <td><ul>{{ member.requested_gear }}</ul>
  <td>
    <button class="action edit" hx-put="/rest/trip/{{ trip_id }}/member/{{ member.id }}">Admit</button>
    <button class="action edit"
            hx-delete="/rest/trip/{{ trip_id }}/member/{{ member.id }}"
            hx-confirm="Are you sure you want to reject {{ member.name }}? Keep in mind that doing so will also remove their gear request."
            >Reject</button>
</tr>
{% endfor %}
</table>
<div class=button-row>
  <button id=copy-pending-emails class="action edit" onclick="copyPendingEmails()">Copy Emails</button>
</div>

<div class=dual-table-container>
<div>
  <div class=table-status-row><h2>Individual Gear</h2>{{ member_gear_status }}</div>
  <table class="detail-table gear">
    {% for item in member_requested_gear %}
    <tr><th>{{ item.name }}<td>{{ item.quantity }}
    {% endfor %}
  </table>
  {% if show_member_gear_approval_buttons %}
  <div class=button-row>
    <button class="action deny" hx-put="/rest/opo/member-gear/{{ trip_id }}/deny">Deny</button>
    {% if member_gear_approved === 1 %}
    <button class="action edit" hx-put="/rest/opo/member-gear/{{ trip_id }}/reset">Un-approve</button>
    {% else %}
    <button class="action approve" hx-put="/rest/opo/member-gear/{{ trip_id }}/approve">Approve</button>
    {% endif %}
  </div>
  {% endif %}
</div>
<div>
  <div class=table-status-row><h2>Group Gear</h2>{{ group_gear_status }}</div>
  <table class="detail-table gear">
    {% for item in group_gear %}
    <tr><th>{{ item.name }}<td>{{ item.quantity }}
    {% endfor %}
  </table>
  {% if show_group_gear_approval_buttons %}
  <div class=button-row>
    <button class="action deny" hx-put="/rest/opo/group-gear/{{ trip_id }}/deny">Deny</button>
    {% if group_gear_approved === 1 %}
    <button class="action edit" hx-put="/rest/opo/group-gear/{{ trip_id }}/reset">Un-approve</button>
    {% else %}
    <button class="action approve" hx-put="/rest/opo/group-gear/{{ trip_id }}/approve">Approve</button>
    {% endif %}
  </div>
  {% endif %}
  </div>
</div>
</div>

{%if pcard_request %}
<div>
  <div class=table-status-row><h2>P-Card Request</h2>{{ pcard_request.status }}</div>
  <p>Expected # of Participants: {{ pcard_request.num_people }}
  <table class="detail-table gear">
    <tr><th>Snacks ($3 / person)<td>{{ pcard_request.snacks }}
    <tr><th>Breakfast ($4 / person)<td>{{ pcard_request.breakfast }}
    <tr><th>Lunch ($5 / person)<td>{{ pcard_request.lunch }}
    <tr><th>Dinner ($6 / person)<td>{{ pcard_request.dinner }}
    <tr class=summary><th>Total<td>${{ pcard_request.total }}
  </table>
  {% if show_pcard_approval_buttons %}
  <form hx-put="/rest/opo/pcard/{{ trip_id }}/approve">
    <label>Assigned P-Card:
      <input name=assigned_pcard
             type=text
             value="{{ pcard_request.assigned_pcard }}"
             {% if pcard_request.is_approved === 1 %}disabled{%endif%}
             >
    </label>
    <div class=button-row>
      <button class="action deny" hx-put="/rest/opo/pcard/{{ trip_id }}/deny">Deny</button>
      {% if pcard_request.is_approved === 1 %}
      <button class="action edit" hx-put="/rest/opo/pcard/{{ trip_id }}/reset">Un-approve</button>
      {% else %}
      <button class="action approve" type=submit>Approve</button>
      {% endif %}
    </div>
  </form>
  {% else %}
  <p>Assigned P-Card: {{ pcard_request.assigned_pcard }}</p>
  {% endif %}
</div>
{% endif %}

{%if vehiclerequest_id %}
{% include "requests/vehicle-request-table.njs" %}
{% endif %}

{% if can_delete %}
<h2>Modify Trip</h2>
<div class="edit-row">
  <a class="action edit" href="/trip/{{ trip_id }}/edit">Edit Trip</a>
  <a class="action edit" href="/trip/{{ trip_id }}/requests">Edit Requests</a>
</div>
{% endif %}

<h2>Delete Trip</h2>
<p>Click this checkbox to enable the delete button:
<input type=checkbox autocomplete=off onchange="toggleDeleteButton(this)">
<div class="edit-row">
<button
    class="action deny delete-trip"
    disabled
    autocomplete=off
    hx-delete="/rest/trip/{{ trip_id }}"
    hx-confirm="Are you sure you want to delete trip {{ title }}? Keep in mind that this will delete the associated vehicle request. This action cannot be reversed."
    >Delete Trip
</button>
</div>

</section>

<script>
function toggleDeleteButton(checkbox) {
  const button = document.querySelector('.delete-trip')
  button.disabled = !checkbox.checked
}

async function copyLink() {
  const button = document.getElementById('share-link')
  const previousText = button.innerText
  const domain = window.location.origin
  navigator.clipboard.writeText(`${domain}/trip/{{trip_id}}`)
  button.innerText = 'Link Copied!'
  setTimeout(() => button.innerText = previousText, 1000)
}

async function copyAttendingEmails() {
  const button = document.getElementById('copy-attending-emails')
  const previousText = button.innerText
  navigator.clipboard.writeText('{{attending_emails_list}}')
  button.innerText = 'Emails Copied!'
  setTimeout(() => button.innerText = previousText, 1000)
}

async function copyPendingEmails() {
  const button = document.getElementById('copy-pending-emails')
  const previousText = button.innerText
  navigator.clipboard.writeText('{{pending_emails_list}}')
  button.innerText = 'Emails Copied!'
  setTimeout(() => button.innerText = previousText, 1000)
}

</script>
