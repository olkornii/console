import * as React from 'react';
import { NavItem } from '@patternfly/react-core';

export const ExternalNavLink = ({ href, name }: ExternalLinkProps): React.ReactElement => (
  <NavItem isActive={false}>
    <a
      className="pf-v6-c-nav__link"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-test="nav"
    >
      {name}
      <span className="co-external-link" />
    </a>
  </NavItem>
);

type ExternalLinkProps = {
  href: string;
  name: React.ReactNode;
};
