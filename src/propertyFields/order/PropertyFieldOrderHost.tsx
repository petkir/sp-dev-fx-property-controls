import * as React from 'react';
import {
  IButtonStyles,
  IconButton,
  Selection,
  Label,
  DragDropHelper,
  type IDragDropContext,
  EventGroup
} from '@fluentui/react';

import * as telemetry from '../../common/telemetry';
import {
  IPropertyFieldOrderHostProps,
  IPropertyFieldOrderHostState,
} from './IPropertyFieldOrderHost';
import styles from './PropertyFieldOrderHost.module.scss';
import { isEqual } from '@microsoft/sp-lodash-subset';

export default class PropertyFieldOrderHost extends React.Component<
  IPropertyFieldOrderHostProps,
  IPropertyFieldOrderHostState
> {
  private _draggedItem: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  private _selection: Selection;
  private _ddHelper: DragDropHelper;
  private _refs: Array<HTMLElement>;
  private _ddSubs: Array<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  private _lastBox: HTMLElement;

  constructor(
    props: IPropertyFieldOrderHostProps,
    state: IPropertyFieldOrderHostState
  ) {
    super(props);

    telemetry.track('PropertyFieldOrder', {
      disabled: props.disabled,
    });

    this._selection = null;

    this._ddHelper = new DragDropHelper({
      selection: this._selection,
    });

    this._refs = new Array<HTMLElement>();
    this._ddSubs = new Array<any>(); // eslint-disable-line @typescript-eslint/no-explicit-any

    this._draggedItem = null;

    this.state = {
      items: [],
    };
  }

  public render(): JSX.Element {
    const { items } = this.state;
    return (
      <div className={styles.propertyFieldOrder}>
        {this.props.label && <Label>{this.props.label}</Label>}
        <ul
          style={{
            maxHeight: this.props.maxHeight
              ? this.props.maxHeight + 'px'
              : '100%',
          }}
          className={!this.props.disabled ? styles.enabled : styles.disabled}
        >
          {items &&
            items.length > 0 &&
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items.map((value: any, index: number) => {
              return (
                <li
                  ref={this.registerRef}
                  key={index}
                  draggable={
                    !this.props.disableDragAndDrop && !this.props.disabled
                  }
                  style={{
                    cursor:
                      !this.props.disableDragAndDrop && !this.props.disabled
                        ? 'pointer'
                        : 'default',
                  }}
                >
                  {this.renderItem(value, index)}
                </li>
              );
            })}
          {items && items.length > 0 && (
            <div
              className={styles.lastBox}
              ref={(ref: HTMLElement) => {
                this._lastBox = ref;
              }}
            />
          )}
        </ul>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private renderItem(item: any, index: number): JSX.Element {
    return (
      <div>
        <div className={styles.itemBox}>
          {this.renderDisplayValue(item, index)}
        </div>
        {!this.props.removeArrows && <div>{this.renderArrows(index)}</div>}
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private renderDisplayValue(item: any, index: number): JSX.Element {
    if (typeof this.props.onRenderItem === 'function') {
      return this.props.onRenderItem(item, index);
    } else {
      return (
        <span>
          {this.props.textProperty
            ? item[this.props.textProperty]
            : item.toString()}
        </span>
      );
    }
  }

  private renderArrows(index: number): JSX.Element {
    const arrowButtonStyles: Partial<IButtonStyles> = {
      root: {
        width: '14px',
        height: '100%',
        display: 'inline-block',
      },
      rootDisabled: {
        backgroundColor: 'transparent',
      },
      icon: {
        fontSize: '10px',
      },
    };

    return (
      <div>
        <IconButton
          disabled={this.props.disabled || index === 0}
          iconProps={{ iconName: this.props.moveUpIconName }}
          onClick={() => {
            this.onMoveUpClick(index);
          }}
          styles={arrowButtonStyles}
        />
        <IconButton
          disabled={
            this.props.disabled || index === this.props.items.length - 1
          }
          iconProps={{ iconName: this.props.moveDownIconName }}
          onClick={() => {
            this.onMoveDownClick(index);
          }}
          styles={arrowButtonStyles}
        />
      </div>
    );
  }

  public UNSAFE_componentWillMount(): void {
    this.setState({
      items: this.props.items || [],
    });
  }

  public componentDidMount(): void {
    this.setupSubscriptions();
  }

  public UNSAFE_componentWillUpdate(
    nextProps: IPropertyFieldOrderHostProps
  ): void {
    // Check if the provided items are still the same
    if (!isEqual(nextProps.items, this.state.items)) {
      this.setState({
        items: this.props.items || [],
      });
    }
  }

  public componentDidUpdate(): void {
    this.cleanupSubscriptions();
    this.setupSubscriptions();
  }

  public componentWillUnmount(): void {
    this.cleanupSubscriptions();
  }

  private registerRef = (ref: HTMLElement): void => {
    this._refs.push(ref);
  };

  private setupSubscriptions = (): void => {
    if (!this.props.disableDragAndDrop && !this.props.disabled) {
      this._refs.forEach((value: HTMLElement, index: number) => {
        this._ddSubs.push(
          this._ddHelper.subscribe(value, new EventGroup(value), {
            eventMap: [
              {
                callback: (context: IDragDropContext) => {
                  this._draggedItem = context.data;
                },
                eventName: 'dragstart',
              },
            ],
            selectionIndex: index,
            context: { data: this.state.items[index], index: index },
            updateDropState: (isDropping: boolean, event: DragEvent) => {
              if (isDropping) {
                value.classList.add(styles.dragEnter);
              } else {
                value.classList.remove(styles.dragEnter);
              }
            },
            canDrop: (
              dropContext?: IDragDropContext,
              dragContext?: IDragDropContext
            ) => {
              return true;
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            canDrag: (item?: any) => {
              return true;
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onDrop: (item?: any) => {
              if (this._draggedItem) {
                this.insertBeforeItem(item);
              }
            },
            onDragEnd: () => {
              this._draggedItem = null;
            },
          })
        );
      });

      //Create dropable area below list to allow items to be dragged to the bottom
      if (this._refs.length && typeof this._lastBox !== 'undefined') {
        this._ddSubs.push(
          this._ddHelper.subscribe(
            this._lastBox,
            new EventGroup(this._lastBox),
            {
              selectionIndex: this._refs.length,
              context: { data: {}, index: this._refs.length },
              updateDropState: (isDropping: boolean, event: DragEvent) => {
                if (isDropping) {
                  this._refs[this._refs.length - 1].classList.add(
                    styles.dragLast
                  );
                } else {
                  this._refs[this._refs.length - 1].classList.remove(
                    styles.dragLast
                  );
                }
              },
              canDrop: (
                dropContext?: IDragDropContext,
                dragContext?: IDragDropContext
              ) => {
                return true;
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onDrop: (item?: any, event?: DragEvent) => {
                if (this._draggedItem) {
                  const itemIndex: number = this.state.items.indexOf(
                    this._draggedItem
                  );
                  this.moveItemAtIndexToTargetIndex(
                    itemIndex,
                    this.state.items.length - 1
                  );
                }
              },
            }
          )
        );
      }
    }
  };

  private cleanupSubscriptions = (): void => {
    while (this._ddSubs.length) {
      const sub: any = this._ddSubs.pop(); // eslint-disable-line @typescript-eslint/no-explicit-any
      sub.dispose();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private insertBeforeItem = (item: any): void => {
    const itemIndex: number = this.state.items.indexOf(this._draggedItem);
    let targetIndex: number = this.state.items.indexOf(item);
    if (itemIndex < targetIndex) {
      targetIndex -= 1;
    }
    this.moveItemAtIndexToTargetIndex(itemIndex, targetIndex);
  };

  private onMoveUpClick = (itemIndex: number): void => {
    if (itemIndex > 0) {
      this.moveItemAtIndexToTargetIndex(itemIndex, itemIndex - 1);
    }
  };

  private onMoveDownClick = (itemIndex: number): void => {
    if (itemIndex < this.state.items.length - 1) {
      this.moveItemAtIndexToTargetIndex(itemIndex, itemIndex + 1);
    }
  };

  private moveItemAtIndexToTargetIndex = (
    itemIndex: number,
    targetIndex: number
  ): void => {
    if (
      itemIndex !== targetIndex &&
      itemIndex > -1 &&
      targetIndex > -1 &&
      itemIndex < this.state.items.length &&
      targetIndex < this.state.items.length
    ) {
      const items: Array<any> = this.state.items; // eslint-disable-line @typescript-eslint/no-explicit-any
      items.splice(targetIndex, 0, ...items.splice(itemIndex, 1));

      this.setState({
        items: items,
      });

      this.props.valueChanged(items);
    }
  };
}
