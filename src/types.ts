export interface Task {
  id: string;
  title: string;
  type: string;
  status: 'backlog' | 'doing' | 'done';
  priority: string;
  readiness: string;
  epic: string;
  spec: string;
  labels: string[];
  code_paths: string[];
  depends_on: string[];
  blocks: string[];
  estimate: string;
  risk: string;
  filePath: string;
  body: string;
}

export interface Warning {
  type: 'missingSpec' | 'missingEpic' | 'unknownDependency' | 'duplicateId' | 'invalidFrontmatter';
  message: string;
  filePath?: string;
}
