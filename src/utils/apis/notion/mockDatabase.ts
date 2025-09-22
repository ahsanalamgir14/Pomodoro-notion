// Mock implementations for Notion database API functions to avoid authentication errors

import { DatabaseList } from "../../../types/database/database.list";
import { DatabaseQuery } from "../../../types/database/databaseQuery";
import { DatabaseDetail } from "../../../types/database/databaseDetail";

// Mock database list data
const mockDatabaseList: DatabaseList = {
  object: "list",
  results: [
    {
      object: "database",
      id: "demo-database-123",
      cover: null,
      icon: {
        type: "emoji",
        emoji: "📋"
      },
      created_time: "2024-01-01T00:00:00.000Z",
      created_by: {
        object: "user",
        id: "demo-user-123"
      },
      last_edited_by: {
        object: "user",
        id: "demo-user-123"
      },
      last_edited_time: "2024-01-01T00:00:00.000Z",
      title: [
        {
          type: "text",
          text: {
            content: "Demo Tasks Database",
            link: null
          },
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default"
          },
          plain_text: "Demo Tasks Database",
          href: null
        }
      ],
      description: [],
      is_inline: false,
      properties: {
        "Name": {
          id: "title",
          name: "Name",
          type: "title",
          title: {}
        },
        "Status": {
          id: "status",
          name: "Status",
          type: "select",
          select: {
            options: [
              {
                id: "1",
                name: "Not started",
                color: "default"
              },
              {
                id: "2",
                name: "In progress",
                color: "blue"
              },
              {
                id: "3",
                name: "Done",
                color: "green"
              }
            ]
          }
        },
        "Priority": {
          id: "priority",
          name: "Priority",
          type: "select",
          select: {
            options: [
              {
                id: "1",
                name: "Low",
                color: "gray"
              },
              {
                id: "2",
                name: "Medium",
                color: "yellow"
              },
              {
                id: "3",
                name: "High",
                color: "red"
              }
            ]
          }
        },
        "Created At": {
          id: "created",
          name: "Created At",
          type: "created_time",
          created_time: {}
        }
      },
      parent: {
        type: "page_id",
        page_id: "demo-page-123"
      },
      url: "https://notion.so/demo-database-123",
      archived: false
    }
  ],
  next_cursor: null,
  has_more: false
};

// Mock database query data (pages within a database)
const mockDatabaseQuery: DatabaseQuery = {
  object: "list",
  results: [
    {
      object: "page",
      id: "demo-page-1",
      created_time: "2024-01-01T00:00:00.000Z",
      last_edited_time: "2024-01-01T00:00:00.000Z",
      created_by: {
        object: "user",
        id: "demo-user-123"
      },
      last_edited_by: {
        object: "user",
        id: "demo-user-123"
      },
      cover: null,
      icon: null,
      parent: {
        type: "database_id",
        database_id: "demo-database-123"
      },
      archived: false,
      properties: {
        "Name": {
          id: "title",
          type: "title",
          title: [
            {
              type: "text",
              text: {
                content: "Demo Task 1",
                link: null
              },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default"
              },
              plain_text: "Demo Task 1",
              href: null
            }
          ]
        },
        "Status": {
          id: "status",
          type: "select",
          select: {
            id: "2",
            name: "In progress",
            color: "blue"
          }
        },
        "Priority": {
          id: "priority",
          type: "select",
          select: {
            id: "3",
            name: "High",
            color: "red"
          }
        }
      },
      url: "https://notion.so/demo-page-1"
    }
  ],
  next_cursor: null,
  has_more: false
};

// Mock database detail data
const mockDatabaseDetail: DatabaseDetail = {
  object: "database",
  id: "demo-database-123",
  cover: null,
  icon: {
    type: "emoji",
    emoji: "📋"
  },
  created_time: "2024-01-01T00:00:00.000Z",
  created_by: {
    object: "user",
    id: "demo-user-123"
  },
  last_edited_by: {
    object: "user",
    id: "demo-user-123"
  },
  last_edited_time: "2024-01-01T00:00:00.000Z",
  title: [
    {
      type: "text",
      text: {
        content: "Demo Tasks Database",
        link: null
      },
      annotations: {
        bold: false,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
        color: "default"
      },
      plain_text: "Demo Tasks Database",
      href: null
    }
  ],
  description: [],
  is_inline: false,
  properties: {
    "Name": {
      id: "title",
      name: "Name",
      type: "title",
      title: {}
    },
    "Status": {
      id: "status",
      name: "Status",
      type: "select",
      select: {
        options: [
          {
            id: "1",
            name: "Not started",
            color: "default"
          },
          {
            id: "2",
            name: "In progress",
            color: "blue"
          },
          {
            id: "3",
            name: "Done",
            color: "green"
          }
        ]
      }
    },
    "Priority": {
      id: "priority",
      name: "Priority",
      type: "select",
      select: {
        options: [
          {
            id: "1",
            name: "Low",
            color: "gray"
          },
          {
            id: "2",
            name: "Medium",
            color: "yellow"
          },
          {
            id: "3",
            name: "High",
            color: "red"
          }
        ]
      }
    },
    "Created At": {
      id: "created",
      name: "Created At",
      type: "created_time",
      created_time: {}
    }
  },
  parent: {
    type: "page_id",
    page_id: "demo-page-123"
  },
  url: "https://notion.so/demo-database-123",
  archived: false
};

export const queryDatabase = async (
  id: string,
  serverSide = false,
  token = ""
): Promise<DatabaseQuery> => {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockDatabaseQuery;
};

export const retrieveDatabase = async (
  id: string,
  serverSide = false,
  token = ""
): Promise<DatabaseDetail> => {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockDatabaseDetail;
};

export const listDatabases = async (
  serverSide = false,
  token = ""
): Promise<DatabaseList> => {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));
  return mockDatabaseList;
};