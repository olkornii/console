import * as React from 'react';
import * as _ from 'lodash';
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom-v5-compat';
import { useK8sModel } from '@console/shared/src/hooks/useK8sModel';
import { useActiveNamespace } from '@console/shared/src/hooks/useActiveNamespace';
import { ALL_NAMESPACES_KEY } from '@console/shared/src/constants/common';
import {
  ListPageCreateProps,
  CreateWithPermissionsProps,
  ListPageCreateLinkProps,
  ListPageCreateButtonProps,
  ListPageCreateDropdownProps,
} from '@console/dynamic-plugin-sdk/src/extensions/console-types';
import { RequireCreatePermission } from '../../utils/rbac';
import { transformGroupVersionKindToReference } from '@console/dynamic-plugin-sdk/src/utils/k8s/k8s-ref';

const CreateWithPermissions: React.FC<CreateWithPermissionsProps> = ({
  createAccessReview,
  children,
}) => {
  const [k8sModel] = useK8sModel(createAccessReview?.groupVersionKind);
  return !_.isEmpty(createAccessReview) ? (
    <RequireCreatePermission model={k8sModel} namespace={createAccessReview.namespace}>
      {children}
    </RequireCreatePermission>
  ) : (
    <>{children}</>
  );
};

export const ListPageCreateLink: React.FC<ListPageCreateLinkProps> = ({
  to,
  createAccessReview,
  children,
}) => (
  <CreateWithPermissions createAccessReview={createAccessReview}>
    <Link to={to}>
      <Button variant="primary" id="yaml-create" data-test="item-create">
        {children}
      </Button>
    </Link>
  </CreateWithPermissions>
);

export const ListPageCreateButton: React.FC<ListPageCreateButtonProps> = ({
  createAccessReview,
  ...rest
}) => (
  <CreateWithPermissions createAccessReview={createAccessReview}>
    <Button variant="primary" id="yaml-create" data-test="item-create" {...rest} />
  </CreateWithPermissions>
);

export const ListPageCreateDropdown: React.FC<ListPageCreateDropdownProps> = ({
  items,
  createAccessReview,
  children,
  onClick,
}) => {
  const [isOpen, setOpen] = React.useState(false);

  const listCreateDropdownItems = Object.keys(items).map((key) => {
    return (
      <DropdownItem
        key={key}
        data-test={`list-page-create-dropdown-item-${key}`}
        onClick={() => onClick(key)}
      >
        {items[key]}
      </DropdownItem>
    );
  });

  return (
    <CreateWithPermissions createAccessReview={createAccessReview}>
      <Dropdown
        isOpen={isOpen}
        onSelect={() => setOpen(false)}
        onOpenChange={() => setOpen(!isOpen)}
        popperProps={{ position: 'right' }}
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            onClick={() => setOpen(!isOpen)}
            variant="primary"
            isExpanded={isOpen}
            data-test="item-create"
          >
            {children}
          </MenuToggle>
        )}
      >
        <DropdownList>{listCreateDropdownItems}</DropdownList>
      </Dropdown>
    </CreateWithPermissions>
  );
};

const ListPageCreate: React.FC<ListPageCreateProps> = ({
  createAccessReview,
  groupVersionKind,
  children,
}) => {
  const reference = transformGroupVersionKindToReference(groupVersionKind);

  const [k8sModel] = useK8sModel(groupVersionKind);
  const [namespace] = useActiveNamespace();
  let to: string;
  if (k8sModel) {
    const usedNamespace = k8sModel.namespaced
      ? namespace === ALL_NAMESPACES_KEY
        ? undefined
        : namespace
      : undefined;
    to = usedNamespace
      ? `/k8s/ns/${usedNamespace || 'default'}/${k8sModel.plural}/~new`
      : `/k8s/cluster/${k8sModel.plural}/~new`;
    if (k8sModel.crd) {
      to = usedNamespace
        ? `/k8s/ns/${usedNamespace || 'default'}/${reference}/~new`
        : `/k8s/cluster/${reference}/~new`;
    }
  }

  return (
    !!to && (
      <ListPageCreateLink createAccessReview={createAccessReview} to={to}>
        {children}
      </ListPageCreateLink>
    )
  );
};

export default ListPageCreate;
