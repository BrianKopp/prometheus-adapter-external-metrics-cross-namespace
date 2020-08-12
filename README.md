# Prometheus Adapter External Metrics Cross Namespace

How in the heck does one use prometheus adapter to expose
an external metric generated in one namespace but be used
in another namespace.

## Setup

We're using minikube for this experiment.

```sh
minikube start
```

We'll be using prometheus adapter and prometheus operator. We'll
manage them with helm (helm 3).

```sh
helm repo add stable https://kubernetes-charts.storage.googleapis.com
helm repo update
```

Install prometheus operator and prometheus adapter.

```sh
kubectl create namespace monitoring
helm upgrade -i prom-op stable/prometheus-operator -n monitoring -f ./manifests/prom-op.yaml
helm upgrade -i prom-adap stable/prometheus-adapter -n monitoring -f ./manifests/prom-adapt.yaml
```

At this time, the prom-adapt.yaml file looks simply like:

```yaml
prometheus:
  url: http://prom-op-prometheus-operato-prometheus.monitoring.svc
```

## Make Some Applications

Make, build, and push an application in `src/producer`.

```sh
cd src/producer
docker build . -t briankopp/metrics-producer:0.0.1
docker push briankopp/metrics-producer:0.0.1
```

Make a do-nothing application in `src/noop`.

```sh
cd src/noop-server
docker build . -t briankopp/noop-server:0.0.1
docker push briankopp/noop-server:0.0.1
```

## Set Up Producer

```sh
kubectl apply -f ./manifests/producer/namespace.yaml
kubectl apply -f ./manifests/producer/app.yaml
```

Ensure its running `kubectl get pods -n producer`.

Ensure the producer is making its way into grafana.

```sh
# Get the URL to prometheus
minikube --namespace monitoring service prom-op-prometheus-operato-prometheus --url
# http://172.17.0.3:30090
```

Navigate to the URL in a browser, and seach for the metric `foobar`. It should come up
and be reporting 9000.

## Set up Consumer

```sh
kubectl apply -f ./manifests/consumer/namespace.yaml
kubectl apply -f ./manifests/consumer/app.yaml
```

## Plumb the metrics

Before when we created prometheus adapter, it didn't send through any metrics.
We'll need to identify the correct metric config for it to serve.

```sh
> k get hpa -n consumer
NAME       REFERENCE             TARGETS              MINPODS   MAXPODS   REPLICAS   AGE
consumer   Deployment/consumer   <unknown>/1k (avg)   1         10        1          57s
```

Add the following to the `prom-adapt.yaml` file

```yaml
rules:
  external:
  - seriesQuery: 'foobar'
    resources:
      overrides:
        namespace: { resource: namespace }
        service: { resource: service }
        pod: { resource: pod }
    metricsQuery: 'foobar'
```

Redeploy prometheus adapter, and BAM, metrics!

```sh
> k get --raw /apis/external.metrics.k8s.io/v1beta1/
{"kind":"APIResourceList","apiVersion":"v1","groupVersion":"external.metrics.k8s.io/v1beta1","resources":[{"name":"foobar","singularName":"","namespaced":true,"kind":"ExternalMetricValueList","verbs":["get"]}]}
```

Check out the HPA.

```sh
> k get hpa -n consumer
NAME       REFERENCE             TARGETS       MINPODS   MAXPODS   REPLICAS   AGE
consumer   Deployment/consumer   1k/1k (avg)   1         10        9          19m
```
