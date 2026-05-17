{{- define "explain-code.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "explain-code.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "explain-code.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "explain-code.labels" -}}
app.kubernetes.io/name: {{ include "explain-code.name" . }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "explain-code.selectorLabels" -}}
app.kubernetes.io/name: {{ include "explain-code.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "explain-code.postgresName" -}}
{{- printf "%s-postgres" (include "explain-code.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "explain-code.postgresSecretName" -}}
{{- printf "%s-postgres-secret" (include "explain-code.fullname" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "explain-code.publicHost" -}}
{{- default .Values.ingress.host .Values.global.publicHost -}}
{{- end -}}

{{- define "explain-code.publicUrl" -}}
{{- if .Values.global.publicUrl -}}
{{- .Values.global.publicUrl -}}
{{- else -}}
{{- $host := include "explain-code.publicHost" . -}}
{{- if $host -}}
{{- if .Values.ingress.tls.enabled -}}
{{- printf "https://%s" $host -}}
{{- else -}}
{{- printf "http://%s" $host -}}
{{- end -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "explain-code.internalDatabaseEnv" -}}
- name: PGHOST
  value: {{ include "explain-code.postgresName" . | quote }}
- name: PGPORT
  value: {{ .Values.postgres.service.port | quote }}
- name: PGDATABASE
  value: {{ .Values.postgres.auth.database | quote }}
- name: PGUSER
  value: {{ .Values.postgres.auth.username | quote }}
- name: PGPASSWORD
  valueFrom:
    secretKeyRef:
      name: {{ include "explain-code.postgresSecretName" . }}
      key: password
{{- end -}}
