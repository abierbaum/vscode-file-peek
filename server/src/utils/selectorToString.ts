import { Selector } from '../types';

export default function(selector: Selector): string{
  switch(selector.attribute) {
    case 'id':
      return '#' + selector.value;
    case 'class':
      return '.' + selector.value;
    default:
      return selector.value;
  }
}