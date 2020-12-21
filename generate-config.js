/*
*  @TODO - https://status-v2.herokuapp.com/json
*  Generate the config
*/

const fs = require('fs');
const { promisify } = require('util');
const fetch = require('node-fetch');

async function getConfiguration() {
    const response = await fetch('https://status-v2.herokuapp.com/json');
    const networkStatus = await response.json();
    const jobs = [];

    const nodes = { ...networkStatus.CommitteeNodes, ...networkStatus.StandByNodes };

    for (let k in networkStatus.VirtualChains) {
        let chain = networkStatus.VirtualChains[k];

        for (let n in nodes) {
            let node = nodes[n];

            jobs.push({
                name: `${node.Ip.replace(/\./g, '_')}_${chain.Id}`,
                target: `${node.Ip}`,
                metrics_path: `/vchains/${chain.Id}/metrics.prometheus`,
                vcid: chain.Id,
                label: node.Ip.replace(/\./g, '_'),
            });
        }
    }

    return jobs;
}

function getConfigurationOfTrynet() {
    const nodes = [
        {
            name: 'node1',
            ip: '13.125.39.36',
        },
        {
            name: 'us-1',
            ip: '184.72.231.126',
        },
        {
            name: 'us-2',
            ip: '34.195.181.208',
        },
        {
            name: 'us-3',
            ip: '13.57.172.231',
        },
        {
            name: 'us-4',
            ip: '18.144.136.174',
        },
        {
            name: 'us-5',
            ip: '52.9.126.127'
        },
    ];

    const vcs = [7777, 8888, 9998, 9999];
    const jobs = [];

    for (let k in vcs) {
        for (let n in nodes) {
            let ip = nodes[n].ip;
            let vcId = vcs[k];

            let job = {
                name: `${ip.replace(/\./g, '_')}_${vcId}`,
                target: `${ip}`,
                metrics_path: `/vchains/${vcId}/metrics.prometheus`,
                vcid: vcId.toString(),
                label: ip.replace(/\./g, '_'),
            };
            jobs.push(job);
        }
    }

    return jobs;
}

function detectConfigChanges({ oldConfig, newConfig, removeCallback, addCallback }) {
    const mergedConfig = [];

    for (let n in newConfig) {
        const podConfig = newConfig[n];
        if (oldConfig.findIndex(c => c.targetUrl === podConfig.targetUrl) === -1) {
            // This is a new endpoint to monitor
            addCallback(podConfig);
        }
        mergedConfig.push(podConfig);
    }

    for (let n in oldConfig) {
        const podConfig = oldConfig[n];
        if (newConfig.findIndex(c => c.targetUrl === podConfig.targetUrl) === -1) {
            // This is a pod that we do not need to monitor anymore.
            removeCallback(podConfig);
        }
    }

    return newConfig;
}

function interpolate({ base, job }) {
    let s = base;

    for (let k in job) {
        s = s.replace(`{${k}}`, job[k]);
    }
    return s;
}

(async () => {
    let basePrConfig = await promisify(fs.readFile)('./prometheus/prometheus-base.yml', 'utf-8');
    const base = await promisify(fs.readFile)('./prometheus/job_template.yml', 'utf-8');

    let v2Jobs = await getConfiguration();
    let trynetJobs = getConfigurationOfTrynet();
    const jobs = [].concat(v2Jobs, trynetJobs);    

    let jobsInterpolated = '';

    for (let i in jobs) {
        let job = jobs[i];
        jobsInterpolated += interpolate({ job, base });
    }

    basePrConfig = basePrConfig.replace('{jobs}', jobsInterpolated);

    await promisify(fs.writeFile)('./prometheus/prometheus.yml', basePrConfig);
})();
