import { useMemo, useState } from 'react';
import { faker } from '@faker-js/faker';
import { createFileRoute } from '@tanstack/react-router';

import { DataGrid, RowHeaderColumn, type Column, type SortColumn } from '../../src';
import { renderSortableHeaderCell } from '../components';
import { compare, formatCurrency, formatDate } from '../utils';

export const Route = createFileRoute('/CommonFeatures')({
  component: CommonFeatures
});

interface Row {
  id: number;
  task: string;
  client: string;
  area: string;
  country: string;
  contact: string;
  assignee: string;
  progress: number;
  startTimestamp: number;
  endTimestamp: number;
  budget: number;
  transaction: string;
  account: string;
  version: string;
  available: boolean;
}

const columns: readonly Column<Row>[] = [
  RowHeaderColumn,
  {
    key: 'task',
    name: 'Task',
    frozen: 'start'
  },
  {
    key: 'client',
    name: 'Client',
    width: 'max-content'
  },
  {
    key: 'area',
    name: 'Area'
  },
  {
    key: 'country',
    name: 'Country'
  },
  {
    key: 'contact',
    name: 'Contact'
  },
  {
    key: 'assignee',
    name: 'Assignee'
  },
  {
    key: 'progress',
    name: 'Completion',
    renderCell(props) {
      const value = props.row.progress;
      return (
        <>
          <progress max={100} value={value} style={{ inlineSize: 50 }} /> {Math.round(value)}%
        </>
      );
    }
  },
  {
    key: 'startTimestamp',
    name: 'Start Date',
    renderCell(props) {
      return formatDate(props.row.startTimestamp);
    }
  },
  {
    key: 'endTimestamp',
    name: 'Deadline',
    renderCell(props) {
      return formatDate(props.row.endTimestamp);
    }
  },
  {
    key: 'budget',
    name: 'Budget',
    renderCell(props) {
      return formatCurrency(props.row.budget);
    }
  },
  {
    key: 'transaction',
    name: 'Transaction Type'
  },
  {
    key: 'account',
    name: 'Account'
  },
  {
    key: 'version',
    name: 'Version'
  },
  {
    key: 'available',
    name: 'Available',
    frozen: 'end',
    renderCell({ row }) {
      return row.available ? 'Yes' : 'No';
    }
  }
];

function rowKeyGetter(row: Row) {
  return row.id;
}

function createRows(): readonly Row[] {
  const now = Date.now();
  const rows: Row[] = [];

  for (let i = 0; i < 1000; i++) {
    rows.push({
      id: i,
      task: `Task #${i + 1}`,
      client: faker.company.name(),
      area: faker.person.jobArea(),
      country: faker.location.country(),
      contact: faker.internet.exampleEmail(),
      assignee: faker.person.fullName(),
      progress: Math.random() * 100,
      startTimestamp: now - Math.round(Math.random() * 1e10),
      endTimestamp: now + Math.round(Math.random() * 1e10),
      budget: 500 + Math.random() * 10_500,
      transaction: faker.finance.transactionType(),
      account: faker.finance.iban(),
      version: faker.system.semver(),
      available: Math.random() > 0.5
    });
  }

  return rows;
}

type Comparator = (a: Row, b: Row) => number;

function getComparator({ columnKey, direction }: SortColumn): Comparator {
  let sortFn: Comparator;

  switch (columnKey) {
    case 'assignee':
    case 'task':
    case 'client':
    case 'area':
    case 'country':
    case 'contact':
    case 'transaction':
    case 'account':
    case 'version':
      sortFn = (a, b) => {
        return compare(a[columnKey], b[columnKey]);
      };
      break;
    case 'available':
      sortFn = (a, b) => {
        return a[columnKey] === b[columnKey] ? 0 : a[columnKey] ? 1 : -1;
      };
      break;
    case 'progress':
    case 'startTimestamp':
    case 'endTimestamp':
    case 'budget':
      sortFn = (a, b) => {
        return a[columnKey] - b[columnKey];
      };
      break;
    default:
      throw new Error(`unsupported columnKey: "${columnKey}"`);
  }

  if (direction === 'DESC') {
    return (a, b) => sortFn(b, a);
  }

  return sortFn;
}

function CommonFeatures() {
  const [rows] = useState(createRows);
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);

  const sortedRows = useMemo((): readonly Row[] => {
    if (sortColumns.length === 0) return rows;

    const comparators = sortColumns.map(getComparator);

    return rows.toSorted((a, b) => {
      for (const comparator of comparators) {
        const compResult = comparator(a, b);
        if (compResult !== 0) {
          return compResult;
        }
      }
      return 0;
    });
  }, [rows, sortColumns]);

  return (
    <DataGrid
      aria-label="Common Features Example"
      rowKeyGetter={rowKeyGetter}
      columns={columns}
      rows={sortedRows}
      defaultColumnOptions={{
        sortable: true,
        renderHeaderCell: renderSortableHeaderCell,
        resizable: true
      }}
      sortColumns={sortColumns}
      onSortColumnsChange={setSortColumns}
      className="fill-grid"
    />
  );
}
