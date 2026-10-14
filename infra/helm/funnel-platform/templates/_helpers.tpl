{{- define "fp.image" -}}{{ .root.Values.image.registry }}/fp-{{ .name }}:{{ .root.Values.image.tag | default .root.Chart.AppVersion }}{{- end -}}
{{- define "fp.securityContext" -}}
securityContext:
  runAsNonRoot: true
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  capabilities: { drop: [ALL] }
{{- end -}}
