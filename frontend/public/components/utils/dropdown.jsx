import * as _ from 'lodash-es';
import * as React from 'react';
import { css } from '@patternfly/react-styles';
import * as PropTypes from 'prop-types';
import { useUserSettingsCompatibility } from '@console/shared';
import { Divider, Popper, Title } from '@patternfly/react-core';
import { CaretDownIcon } from '@patternfly/react-icons/dist/esm/icons/caret-down-icon';
import { CheckIcon } from '@patternfly/react-icons/dist/esm/icons/check-icon';
import { StarIcon } from '@patternfly/react-icons/dist/esm/icons/star-icon';
import { withTranslation } from 'react-i18next';

class DropdownMixin extends React.PureComponent {
  constructor(props) {
    super(props);
    this.listener = this._onWindowClick.bind(this);
    this.state = { active: !!props.active, selectedKey: props.selectedKey };
    this.toggle = this.toggle.bind(this);
    this.dropdownElement = React.createRef();
    this.dropdownList = React.createRef();
    this.dropdownMenuRef = React.createRef();
    this.dropdownToggleRef = React.createRef();
  }

  _onWindowClick(event) {
    if (!this.state.active) {
      return;
    }

    const { current } = this.dropdownElement;
    if (!current) {
      return;
    }

    if (event.target === current || (current && current.contains(event.target))) {
      return;
    }

    this.hide(event);
  }

  UNSAFE_componentWillReceiveProps({ selectedKey, items }) {
    if (selectedKey !== this.props.selectedKey) {
      const title = items[selectedKey] || this.props.title;
      this.setState({ selectedKey, title });
    }
  }

  componentWillUnmount() {
    window.removeEventListener('click', this.listener);
  }

  onClick_(selectedKey, e) {
    e.preventDefault();
    e.stopPropagation();
    e.nativeEvent?.stopImmediatePropagation?.();

    const { items, actionItems, onChange, noSelection, title } = this.props;

    if (onChange) {
      onChange(selectedKey, e);
    }

    const newTitle = items[selectedKey];

    if (!actionItems || !_.some(actionItems, { actionKey: selectedKey })) {
      this.setState({
        selectedKey,
        title: noSelection ? title : newTitle,
      });
    }

    this.hide();
  }

  toggle(e) {
    e.preventDefault();

    if (this.props.disabled) {
      return;
    }

    if (this.state.active) {
      this.hide(e);
    } else {
      this.show(e);
    }
  }

  show() {
    /* If you're wondering why this isn't in componentDidMount, it's because
     * kebabs are dropdowns. A list of 200 pods would mean 200 global event
     * listeners. This is bad for performance. - ggreer
     */
    window.removeEventListener('click', this.listener);
    window.addEventListener('click', this.listener);
    this.setState({ active: true });
  }

  hide(e) {
    e && e.stopPropagation();
    window.removeEventListener('click', this.listener);
    this.setState({ active: false });
  }
}

class DropDownRowWithTranslation extends React.PureComponent {
  render() {
    const {
      itemKey,
      content,
      onclick,
      className,
      selected,
      hover,
      autocompleteFilter,
      isBookmarked,
      onBookmark,
      favoriteKey,
      canFavorite,
      onFavorite,
      t,
    } = this.props;

    let prefix;
    const contentString = _.isString(content) ? content : '';

    if (!autocompleteFilter && !onBookmark) {
      // use PatternFly 6 markup if not using the autocomplete dropdown
      return (
        <li key={itemKey} className="pf-v6-c-menu__list-item">
          <button
            className="pf-v6-c-menu__item"
            id={`${itemKey}-link`}
            data-test-id="dropdown-menu"
            data-test-dropdown-menu={itemKey}
            onClick={(e) => onclick(itemKey, e)}
          >
            {content}
          </button>
        </li>
      );
    }
    if (onBookmark) {
      prefix = (
        <a
          href="#"
          className={css(
            'pf-v6-c-menu__item-action pf-m-favorite',
            { hover, focus: selected },
            { 'pf-m-favorited': isBookmarked },
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onBookmark(itemKey, !isBookmarked);
          }}
          aria-label={
            isBookmarked
              ? t('public~Remove bookmark {{content}}', { content: contentString })
              : t('public~Add bookmark {{content}}', { content: contentString })
          }
        >
          <span className="pf-v6-c-menu__item-action-icon">
            <StarIcon />
          </span>
        </a>
      );
    }

    let suffix;
    if (isBookmarked && canFavorite) {
      const isFavorite = favoriteKey === itemKey;
      suffix = (
        <a
          href="#"
          className={css('bookmarker', { hover, focus: selected })}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFavorite(isFavorite ? null : itemKey);
          }}
          aria-label={
            isFavorite
              ? t('public~Remove favorite {{content}}', { content: contentString })
              : t('public~Add favorite {{content}}', { content: contentString })
          }
        >
          <StarIcon className={css({ favorite: isFavorite })} />
        </a>
      );
    }

    return (
      <li role="option" className={css('pf-v6-c-menu__list-item', className)} key={itemKey}>
        <a
          href="#"
          ref={this.link}
          id={`${itemKey}-link`}
          data-test="dropdown-menu-item-link"
          className={css('pf-v6-c-menu__item', {
            'pf-m-selected': selected,
          })}
          onClick={(e) => onclick(itemKey, e)}
        >
          <span className="pf-v6-c-menu__item-main">
            <span className="pf-v6-c-menu__item-text">{content}</span>
            <span className="pf-v6-c-menu__item-select-icon">
              <CheckIcon />
            </span>
          </span>
        </a>
        {prefix}
        {suffix}
      </li>
    );
  }
}

const DropDownRow = withTranslation()(DropDownRowWithTranslation);

class Dropdown_ extends DropdownMixin {
  constructor(props) {
    super(props);
    this.onClick = (...args) => this.onClick_(...args);

    this.state.items = props.items;
    this.state.title = props.noSelection
      ? props.title
      : _.get(props.items, props.selectedKey, props.title);

    this.onKeyDown = (e) => this.onKeyDown_(e);
    this.changeTextFilter = (e) => this.applyTextFilter_(e.target.value, this.props.items);
    const { shortCut } = this.props;

    this.globalKeyDown = (e) => {
      if (e.key === 'Escape' && this.state.active) {
        this.hide(e);
        return;
      }

      const { nodeName } = e.target;

      if (nodeName === 'INPUT' || nodeName === 'TEXTAREA') {
        return;
      }

      if (!shortCut || e.key !== shortCut) {
        return;
      }

      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) {
        return;
      }

      e.stopPropagation();
      e.preventDefault();
      this.show(e);
    };
  }

  componentDidMount() {
    if (this.props.shortCut) {
      window.addEventListener('keydown', this.globalKeyDown);
    }
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    window.removeEventListener('keydown', this.globalKeyDown);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    super.UNSAFE_componentWillReceiveProps(nextProps);
    const props = this.props;

    if (_.isEqual(nextProps.items, props.items) && nextProps.title === props.title) {
      return;
    }
    const title = nextProps.title || props.title;
    this.setState({ title });

    this.applyTextFilter_(this.state.autocompleteText, nextProps.items);
  }

  componentDidUpdate(prevProps, prevState) {
    if (!prevState.active && this.state.active && this.input) {
      // Clear any previous filter when reopening the dropdown.
      this.applyTextFilter_('', this.props.items);
    }
  }

  applyTextFilter_(autocompleteText, items) {
    const { autocompleteFilter } = this.props;
    if (autocompleteFilter && !_.isEmpty(autocompleteText)) {
      items = _.pickBy(items, (item, key) => autocompleteFilter(autocompleteText, item, key));
    }
    this.setState({ autocompleteText, items });
  }

  onKeyDown_(e) {
    const { key } = e;

    if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Enter') {
      return;
    }

    const { keyboardHoverKey } = this.state;
    const { items } = this.props;

    if (key === 'Enter') {
      if (this.state.active && items[keyboardHoverKey]) {
        this.onClick(keyboardHoverKey, e);
      }
      return;
    }

    const keys = _.keys(items);

    let index = _.indexOf(keys, keyboardHoverKey);

    if (key === 'ArrowDown') {
      index += 1;
    } else {
      index -= 1;
    }

    // periodic boundaries
    if (index >= keys.length) {
      index = 0;
    }
    if (index < 0) {
      index = keys.length - 1;
    }

    const newKey = keys[index];
    this.setState({ keyboardHoverKey: newKey });
    e.stopPropagation();
  }

  renderActionItem() {
    const { actionItems } = this.props;
    if (actionItems) {
      const { selectedKey, keyboardHoverKey, noSelection } = this.props;
      return (
        <>
          {actionItems.map((ai) => (
            <DropDownRow
              className={css({ active: ai.actionKey === selectedKey && !noSelection })}
              key={`${ai.actionKey}-${ai.actionTitle}`}
              itemKey={ai.actionKey}
              content={ai.actionTitle}
              onclick={this.onClick}
              selected={ai.actionKey === selectedKey && !noSelection}
              hover={ai.actionKey === keyboardHoverKey}
            />
          ))}
          <Divider component="li" />
        </>
      );
    }
    return null;
  }

  render() {
    const { active, autocompleteText, selectedKey, items, title, keyboardHoverKey } = this.state;
    const {
      ariaLabel,
      autocompleteFilter,
      autocompletePlaceholder,
      className,
      buttonClassName,
      menuClassName,
      storageKey,
      dropDownClassName,
      titlePrefix,
      describedBy,
      disabled,
      bookmarks,
      onBookmark,
      favoriteKey,
      canFavorite,
      onFavorite,
    } = this.props;
    const spacerBefore = this.props.spacerBefore || new Set();
    const headerBefore = this.props.headerBefore || {};
    const rows = [];
    const bookMarkRows = [];

    const addItem = (key, content) => {
      const selected = key === selectedKey && !this.props.noSelection;
      const hover = key === keyboardHoverKey;
      const klass = css({ active: selected });
      if (storageKey && bookmarks && bookmarks[key]) {
        bookMarkRows.push(
          <DropDownRow
            className={klass}
            key={key}
            itemKey={key}
            content={content}
            onclick={this.onClick}
            selected={selected}
            hover={hover}
            isBookmarked
            onBookmark={onBookmark}
            favoriteKey={favoriteKey}
            canFavorite={canFavorite}
            onFavorite={onFavorite}
          />,
        );
        return;
      }
      if (spacerBefore.has(key)) {
        rows.push(
          <li key={`${key}-spacer`}>
            <div className="dropdown-menu__divider" />
          </li>,
        );
      }

      if (_.has(headerBefore, key)) {
        rows.push(
          <li key={`${key}-header`}>
            <div className="dropdown-menu__header">{headerBefore[key]}</div>
          </li>,
        );
      }
      rows.push(
        <DropDownRow
          className={klass}
          key={key}
          itemKey={key}
          content={content}
          onBookmark={storageKey && onBookmark}
          onclick={this.onClick}
          selected={selected}
          hover={hover}
          autocompleteFilter={autocompleteFilter}
        />,
      );
    };

    _.each(items, (v, k) => addItem(k, v));
    //render PF4 dropdown markup if this is not the autocomplete filter

    if (autocompleteFilter) {
      const autocompleteFilterToggle = (
        <button
          aria-label={ariaLabel}
          aria-haspopup="true"
          onClick={this.toggle}
          onKeyDown={this.onKeyDown}
          type="button"
          className={css('pf-v6-c-menu-toggle', buttonClassName)}
          id={this.props.id}
          aria-describedby={describedBy}
          disabled={disabled}
          data-test={this.props.dataTest}
          ref={this.dropdownToggleRef}
        >
          <div className="pf-v6-c-dropdown__content-wrap">
            <span className="pf-v6-c-dropdown__toggle-text co-nowrap">
              {titlePrefix && `${titlePrefix}: `}
              {title}
            </span>
            <CaretDownIcon className="pf-c-dropdown__toggle-icon" />
          </div>
        </button>
      );
      const autocompleteFilterMenu = (
        <div
          className="pf-v6-c-menu pf-m-scrollable dropdown-menu co-namespace-dropdown__menu"
          ref={this.dropdownMenuRef}
        >
          <div className="pf-v6-c-menu__content" style={{ maxHeight: '60vh' }}>
            {autocompleteFilter && (
              <>
                <div className="pf-v6-c-menu__search">
                  <span className="pf-v6-c-form-control">
                    <input
                      autoFocus
                      type="text"
                      ref={(input) => (this.input = input)}
                      onChange={this.changeTextFilter}
                      placeholder={autocompletePlaceholder}
                      value={autocompleteText || ''}
                      autoCapitalize="none"
                      onKeyDown={this.onKeyDown}
                      onClick={(e) => e.stopPropagation()}
                      data-test-id="dropdown-text-filter"
                    />
                  </span>
                </div>
                <Divider />
              </>
            )}
            {_.size(bookMarkRows) ? (
              <Title headingLevel="h1" className="pf-v6-c-menu__group-title">
                Favorites
              </Title>
            ) : null}
            <ul
              role="listbox"
              ref={this.dropdownList}
              className="pf-v6-c-menu__list dropdown-menu__autocomplete-filter"
            >
              {this.renderActionItem()}
              {bookMarkRows}
              {_.size(bookMarkRows) && _.size(rows) ? <Divider component="li" /> : null}
              {rows}
            </ul>
          </div>
        </div>
      );
      return (
        <div className={className} ref={this.dropdownElement} style={this.props.style}>
          <div
            className={css(
              'pf-v6-c-dropdown',
              { 'pf-m-expanded': this.state.active },
              dropDownClassName,
            )}
          >
            <Popper
              trigger={autocompleteFilterToggle}
              triggerRef={this.dropdownToggleRef}
              popper={autocompleteFilterMenu}
              popperRef={this.dropdownMenuRef}
              isVisible={active}
              zIndex={9999}
              appendTo="inline"
            />
          </div>
        </div>
      );
    }

    const toggle = (
      <button
        aria-label={ariaLabel}
        aria-haspopup="true"
        aria-expanded={this.state.active}
        className={css('pf-v6-c-menu-toggle', buttonClassName)}
        data-test-id="dropdown-button"
        onClick={this.toggle}
        onKeyDown={this.onKeyDown}
        type="button"
        id={this.props.id}
        data-test={this.props.dataTest}
        aria-describedby={describedBy}
        disabled={disabled}
        ref={this.dropdownToggleRef}
      >
        <span className="pf-v6-c-dropdown__toggle-text co-nowrap">
          {titlePrefix && `${titlePrefix}: `}
          {title}
        </span>
        <CaretDownIcon className="pf-c-dropdown__toggle-icon" />
      </button>
    );

    const menu = (
      <div className="pf-v6-c-menu" ref={this.dropdownMenuRef}>
        <div className="pf-v6-c-menu__content">
          <ul ref={this.dropdownList} className={css('pf-v6-c-menu-list', menuClassName)}>
            {rows}
          </ul>
        </div>
      </div>
    );

    // PatternFly 6 markup
    return (
      <div className={className} ref={this.dropdownElement} style={this.props.style}>
        <div
          className={css(
            { 'pf-v6-c-dropdown': true, 'pf-m-expanded': this.state.active },
            dropDownClassName,
          )}
        >
          <Popper
            trigger={toggle}
            triggerRef={this.dropdownToggleRef}
            popper={menu}
            popperRef={this.dropdownMenuRef}
            preventOverflow={menuClassName === 'prevent-overflow' ? true : false}
            isVisible={active}
            zIndex={9999}
            appendTo="inline"
          />
        </div>
      </div>
    );
  }
}

export const Dropdown = (props) => {
  const { userSettingsPrefix, storageKey } = props;

  // Should be undefined so that we don't save undefined-xxx.
  const favoriteUserSettingsKey = userSettingsPrefix ? `${userSettingsPrefix}.favorite` : undefined;
  const favoriteStorageKey = storageKey ? storageKey : undefined;
  const bookmarkUserSettingsKey = userSettingsPrefix
    ? `${userSettingsPrefix}.bookmarks`
    : undefined;
  const bookmarkStorageKey = storageKey ? `${storageKey}-bookmarks` : undefined;

  const [favoriteKey, setFavoriteKey] = useUserSettingsCompatibility(
    favoriteUserSettingsKey,
    favoriteStorageKey,
    undefined,
    true,
  );
  const [bookmarks, setBookmarks] = useUserSettingsCompatibility(
    bookmarkUserSettingsKey,
    bookmarkStorageKey,
    undefined,
    true,
  );

  const onBookmark = React.useCallback(
    (key, active) => {
      setBookmarks((oldBookmarks) => ({ ...oldBookmarks, [key]: active ? true : undefined }));
    },
    [setBookmarks],
  );

  return (
    <Dropdown_
      {...props}
      bookmarks={bookmarks}
      onBookmark={onBookmark}
      favoriteKey={favoriteKey}
      onFavorite={setFavoriteKey}
    />
  );
};

Dropdown.displayName = 'Dropdown';

Dropdown.propTypes = {
  actionItems: PropTypes.arrayOf(
    PropTypes.shape({
      actionKey: PropTypes.string,
      actionTitle: PropTypes.string,
    }),
  ),
  autocompleteFilter: PropTypes.func,
  autocompletePlaceholder: PropTypes.string,
  canFavorite: PropTypes.bool,
  className: PropTypes.string,
  dropDownClassName: PropTypes.string,
  enableBookmarks: PropTypes.bool,
  headerBefore: PropTypes.objectOf(PropTypes.string),
  items: PropTypes.object.isRequired,
  menuClassName: PropTypes.string,
  buttonClassName: PropTypes.string,
  noSelection: PropTypes.bool,
  userSettingsPrefix: PropTypes.string,
  storageKey: PropTypes.string,
  spacerBefore: PropTypes.instanceOf(Set),
  textFilter: PropTypes.string,
  title: PropTypes.node,
  disabled: PropTypes.bool,
  id: PropTypes.string,
  onChange: PropTypes.func,
  selectedKey: PropTypes.string,
  titlePrefix: PropTypes.string,
  ariaLabel: PropTypes.string,
  name: PropTypes.string,
  autoSelect: PropTypes.bool,
  describedBy: PropTypes.string,
  required: PropTypes.bool,
  dataTest: PropTypes.string,
};
