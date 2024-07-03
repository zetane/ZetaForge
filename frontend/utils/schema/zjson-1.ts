export interface BlockInformation {
  id: string;
  name: string;
  description: string;
  system_versions: string[];
  block_version: string;
  block_source: string;
  block_type: string;
}

export interface Connection {
  block: string;
  variable: string;
}

export interface Put {
  type: string;
  connections: Connection[];
  relays?: Connection[]; // Optional
}

export interface Container {
  image: string;
  version: string;
  command_line: string[];
}

export interface Action {
  container?: Container;
  pipeline?: { [key: string]: Block };
  parameters?: { [key: string]: Parameter };
  // Note: TypeScript does not support direct equivalent of Go's struct tags for validation
}

export interface TitleBar {
  background_color?: string;
}

export interface Preview {
  active?: string;
  content?: string;
}

export interface Node {
  active: string;
  title_bar: TitleBar;
  preview: Preview;
  html: string;
  pos_x: string;
  pos_y: string;
  pos_z: string;
  behavior?: string;
}

export interface Views {
  node: Node;
}

export interface Parameter {
  value: string;
  type: string;
}

export interface Event {
  inputs?: { [key: string]: string };
  outputs?: { [key: string]: string };
  log?: string[];
}

export interface Block {
  information: BlockInformation;
  inputs: { [key: string]: Put };
  outputs: { [key: string]: Put };
  action: Action;
  views?: Views;
  events: Event;
}

export interface Pipeline {
  id: string;
  name: string;
  pipeline: { [key: string]: Block };
  sink: string;
  build: string;
}
