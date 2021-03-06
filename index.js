
/*!
 * Copyright (c) 2021 Digital Bazaar, Inc. All rights reserved.
 */
'use strict';

const core = require('@actions/core');
const { context } = require('@actions/github');
const {httpClient} = require('@digitalbazaar/http-client');

// Trigger the PagerDuty webhook with a given alert
async function sendAlert({alert}) {
  const response = await httpClient.post('https://events.pagerduty.com/v2/enqueue', {json: alert});

  if (response.status === 202) {
    console.log(`Successfully sent PagerDuty alert. Response: ${JSON.stringify(response.data)}`);
  } else {
    core.setFailed(
      `PagerDuty API returned status code ${response.status} - ${JSON.stringify(response.data)}`
    );
  }
}

// Run the action
(async () => {
  try {
    const integrationKey = core.getInput('pagerduty-integration-key');

    let alert = {
      payload: {
        summary: `${context.repo.repo}: Error in "${context.workflow}" run by @${context.actor}`,
        timestamp: new Date().toISOString(),
        source: 'GitHub Actions',
        severity: 'critical',
        custom_details: {
          run_details: `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}`,
          related_commits: context.payload.commits
            ? context.payload.commits.map((commit) => `${commit.message}: ${commit.url}`).join(', ')
            : 'No related commits',
        },
      },
      routing_key: integrationKey,
      event_action: 'trigger',
    };
    const dedupKey = core.getInput('pagerduty-dedup-key');
    if (dedupKey != '') {
      alert.dedup_key = dedupKey;
    }
    await sendAlert({alert});
  } catch (error) {
    core.setFailed(error.message);
  }
})();

