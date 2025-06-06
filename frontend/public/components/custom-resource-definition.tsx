import * as _ from 'lodash-es';
import * as React from 'react';
import { css } from '@patternfly/react-styles';
import {
  sortable,
  SortByDirection,
  TableVariant,
  Table as PfTable,
  Thead,
  Tbody,
  Td,
  Th,
  Tr,
} from '@patternfly/react-table';
import { BanIcon } from '@patternfly/react-icons/dist/esm/icons/ban-icon';
import { useTranslation } from 'react-i18next';

import { DetailsPage, ListPage, TableData, RowFunctionArgs, Table } from './factory';
import {
  AsyncComponent,
  DetailsItem,
  EmptyBox,
  Kebab,
  KebabAction,
  LoadingBox,
  navFactory,
  ResourceKebab,
  ResourceLink,
  ResourceSummary,
  SectionHeading,
} from './utils';
import {
  apiVersionCompare,
  CRDVersion,
  CustomResourceDefinitionKind,
  getLatestVersionForCRD,
  K8sKind,
  referenceForCRD,
} from '../module/k8s';
import { CustomResourceDefinitionModel } from '../models';
import { Conditions } from './conditions';
import { getResourceListPages } from './resource-pages';
import { DefaultPage } from './default-resource';
import { GreenCheckCircleIcon } from '@console/shared';
import { useExtensions, isResourceListPage, ResourceListPage } from '@console/plugin-sdk';
import {
  ResourceListPage as DynamicResourceListPage,
  isResourceListPage as isDynamicResourceListPage,
} from '@console/dynamic-plugin-sdk';
import PaneBody from '@console/shared/src/components/layout/PaneBody';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Grid,
  GridItem,
} from '@patternfly/react-core';

const { common } = Kebab.factory;

const crdInstancesPath = (crd: CustomResourceDefinitionKind) =>
  _.get(crd, 'spec.scope') === 'Namespaced'
    ? `/k8s/all-namespaces/${referenceForCRD(crd)}`
    : `/k8s/cluster/${referenceForCRD(crd)}`;

const instances = (kind: K8sKind, obj: CustomResourceDefinitionKind) => ({
  // t('public~View instances')
  labelKey: 'public~View instances',
  href: crdInstancesPath(obj),
});

const menuActions: KebabAction[] = [
  instances,
  ...Kebab.getExtensionsActionsForKind(CustomResourceDefinitionModel),
  ...common,
];

const tableColumnClasses = [
  'pf-m-u-w-33-on-md pf-v6-u-w-25-on-lg',
  'pf-m-u-w-33-on-md pf-v6-u-w-25-on-lg',
  'pf-m-hidden pf-m-visible-on-md',
  'pf-m-hidden pf-m-visible-on-lg',
  'pf-m-hidden pf-m-visible-on-xl',
  Kebab.columnClass,
];

const isEstablished = (conditions: any[]) => {
  const condition = _.find(conditions, (c) => c.type === 'Established');
  return condition && condition.status === 'True';
};

const namespaced = (crd: CustomResourceDefinitionKind) => crd.spec.scope === 'Namespaced';

const Established: React.FC<{ crd: CustomResourceDefinitionKind }> = ({ crd }) => {
  const { t } = useTranslation();
  return crd.status && isEstablished(crd.status.conditions) ? (
    <span>
      <GreenCheckCircleIcon title={t('public~true')} />
    </span>
  ) : (
    <span>
      <BanIcon title={t('public~false')} />
    </span>
  );
};

const EmptyVersionsMsg: React.FC<{}> = () => {
  const { t } = useTranslation();
  return <EmptyBox label={t('public~CRD versions')} />;
};

const CRDVersionTable: React.FC<CRDVersionProps> = ({ versions }) => {
  const { t } = useTranslation();
  const [sortBy, setSortBy] = React.useState({ index: 0, direction: SortByDirection.asc });
  const onSort = React.useCallback(
    (_event, index, direction) => setSortBy({ index, direction }),
    [],
  );
  const compare = React.useCallback(
    (a, b) => {
      const { index, direction } = sortBy;
      const descending = direction === SortByDirection.desc;
      const left = (descending ? b : a)?.[index] ?? '';
      const right = (descending ? a : b)?.[index] ?? '';
      return index === 0 ? apiVersionCompare(left, right) : left.localeCompare(right);
    },
    [sortBy],
  );

  const versionRows = React.useMemo(
    () =>
      versions
        .map(({ name, served, storage }: CRDVersion) => [
          name,
          served?.toString?.(),
          storage?.toString?.(),
        ])
        .sort(compare),
    [versions, compare],
  );

  const headers = React.useMemo(() => [t('public~Name'), t('public~Served'), t('public~Storage')], [
    t,
  ]);

  return versionRows.length > 0 ? (
    <PfTable variant={TableVariant.compact} aria-label={t('public~CRD versions')}>
      <Thead>
        <Tr>
          {headers.map((header, columnIndex) => (
            <Th key={header} sort={{ sortBy, onSort, columnIndex }}>
              {header}
            </Th>
          ))}
        </Tr>
      </Thead>
      <Tbody>
        {versionRows.map(([name, served, storage]) => (
          <Tr key={name}>
            <Td>{name}</Td>
            <Td>{served}</Td>
            <Td>{storage}</Td>
          </Tr>
        ))}
      </Tbody>
    </PfTable>
  ) : (
    <EmptyVersionsMsg />
  );
};

const Details: React.FC<{ obj: CustomResourceDefinitionKind }> = ({ obj: crd }) => {
  const { t } = useTranslation();
  return (
    <>
      <PaneBody>
        <SectionHeading text={t('public~CustomResourceDefinition details')} />
        <Grid hasGutter>
          <GridItem sm={6}>
            <ResourceSummary showPodSelector={false} showNodeSelector={false} resource={crd} />
          </GridItem>
          <GridItem sm={6}>
            <DescriptionList>
              <DescriptionListGroup>
                <DescriptionListTerm>{t('public~Established')}</DescriptionListTerm>
                <DescriptionListDescription>
                  <Established crd={crd} />
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DetailsItem label={t('public~Group')} obj={crd} path="spec.group" />
              <DescriptionListGroup>
                <DescriptionListTerm>{t('public~Latest version')}</DescriptionListTerm>
                <DescriptionListDescription>
                  {getLatestVersionForCRD(crd)}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DetailsItem label={t('public~Scope')} obj={crd} path="spec.scope" />
            </DescriptionList>
          </GridItem>
        </Grid>
      </PaneBody>
      <PaneBody>
        <SectionHeading text={t('public~Conditions')} />
        <Conditions conditions={crd.status.conditions} />
      </PaneBody>
      <PaneBody>
        <SectionHeading text={t('public~Versions')} />
        <CRDVersionTable versions={crd.spec.versions} />
      </PaneBody>
    </>
  );
};

const Instances: React.FC<InstancesProps> = ({ obj, namespace }) => {
  const resourceListPageExtensions = useExtensions<ResourceListPage>(isResourceListPage);
  const dynamicResourceListPageExtensions = useExtensions<DynamicResourceListPage>(
    isDynamicResourceListPage,
  );
  const crdKind = referenceForCRD(obj);
  const componentLoader = getResourceListPages(
    resourceListPageExtensions,
    dynamicResourceListPageExtensions,
  ).get(crdKind, () => Promise.resolve(DefaultPage));
  return (
    <AsyncComponent
      loader={componentLoader}
      namespace={namespace ? namespace : undefined}
      kind={crdKind}
      showTitle={false}
      autoFocus={false}
    />
  );
};

export const CustomResourceDefinitionsList: React.FC<CustomResourceDefinitionsListProps> = (
  props,
) => {
  const { t } = useTranslation();
  const CRDTableHeader = () => {
    return [
      {
        title: t('public~Name'),
        sortField: 'spec.names.kind',
        transforms: [sortable],
        props: { className: tableColumnClasses[0] },
      },
      {
        title: t('public~Group'),
        sortField: 'spec.group',
        transforms: [sortable],
        props: { className: tableColumnClasses[1] },
      },
      {
        title: t('public~Latest version'),
        sortFunc: 'crdLatestVersion',
        transforms: [sortable],
        props: { className: tableColumnClasses[2] },
      },
      {
        title: t('public~Namespaced'),
        sortField: 'spec.scope',
        transforms: [sortable],
        props: { className: tableColumnClasses[3] },
      },
      {
        title: t('public~Established'),
        props: { className: tableColumnClasses[4] },
      },
      {
        title: '',
        props: { className: tableColumnClasses[5] },
      },
    ];
  };
  const CRDTableRow: React.FC<RowFunctionArgs<CustomResourceDefinitionKind>> = ({ obj: crd }) => {
    return (
      <>
        <TableData className={tableColumnClasses[0]}>
          <span className="co-resource-item">
            <ResourceLink
              kind="CustomResourceDefinition"
              name={crd.metadata.name}
              namespace={crd.metadata.namespace}
              displayName={_.get(crd, 'spec.names.kind')}
            />
          </span>
        </TableData>
        <TableData className={css(tableColumnClasses[1], 'co-break-word')}>
          {crd.spec.group}
        </TableData>
        <TableData className={tableColumnClasses[2]}>{getLatestVersionForCRD(crd)}</TableData>
        <TableData className={tableColumnClasses[3]}>
          {namespaced(crd) ? t('public~Yes') : t('public~No')}
        </TableData>
        <TableData className={tableColumnClasses[4]}>
          <Established crd={crd} />
        </TableData>
        <TableData className={tableColumnClasses[5]}>
          <ResourceKebab actions={menuActions} kind="CustomResourceDefinition" resource={crd} />
        </TableData>
      </>
    );
  };

  return (
    <React.Suspense fallback={<LoadingBox />}>
      <Table
        {...props}
        aria-label={CustomResourceDefinitionModel.label}
        Header={CRDTableHeader}
        Row={CRDTableRow}
        defaultSortField="spec.names.kind"
        virtualize
      />
    </React.Suspense>
  );
};

export const CustomResourceDefinitionsPage: React.FC<CustomResourceDefinitionsPageProps> = (
  props,
) => (
  <ListPage
    {...props}
    ListComponent={CustomResourceDefinitionsList}
    kind="CustomResourceDefinition"
    canCreate={true}
    textFilter="custom-resource-definition-name"
  />
);
export const CustomResourceDefinitionsDetailsPage: React.FC = (props) => {
  return (
    <DetailsPage
      {...props}
      kind="CustomResourceDefinition"
      menuActions={menuActions}
      pages={[
        navFactory.details(Details),
        navFactory.editYaml(),
        {
          // t('public~Instances')
          nameKey: 'public~Instances',
          href: 'instances',
          component: Instances,
        },
      ]}
    />
  );
};

export type CustomResourceDefinitionsListProps = {};

export type CustomResourceDefinitionsPageProps = {};

type InstancesProps = {
  obj: CustomResourceDefinitionKind;
  namespace: string;
};

CustomResourceDefinitionsList.displayName = 'CustomResourceDefinitionsList';
CustomResourceDefinitionsPage.displayName = 'CustomResourceDefinitionsPage';

export type CRDVersionProps = {
  versions: CRDVersion[];
};
