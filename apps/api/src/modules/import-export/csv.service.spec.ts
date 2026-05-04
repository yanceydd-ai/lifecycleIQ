import { CsvService } from './csv.service';

describe('CsvService', () => {
  let service: CsvService;

  beforeEach(() => {
    service = new CsvService();
  });

  describe('parse', () => {
    it('returns data rows from a valid CSV', () => {
      const csv = 'name,type\nFoo,bar\nBaz,qux';
      expect(service.parse(csv)).toEqual([
        { name: 'Foo', type: 'bar' },
        { name: 'Baz', type: 'qux' },
      ]);
    });

    it('strips comment rows starting with #', () => {
      const csv = '# comment line\nname,type\nFoo,bar';
      expect(service.parse(csv)).toEqual([{ name: 'Foo', type: 'bar' }]);
    });

    it('strips multiple comment rows', () => {
      const csv = '# line1\n# line2\nname,type\nFoo,bar';
      expect(service.parse(csv)).toEqual([{ name: 'Foo', type: 'bar' }]);
    });

    it('returns empty array for header-only CSV', () => {
      expect(service.parse('name,type')).toEqual([]);
    });

    it('skips empty lines', () => {
      const csv = 'name,type\nFoo,bar\n\nBaz,qux';
      expect(service.parse(csv)).toHaveLength(2);
    });

    it('handles quoted values containing commas', () => {
      const csv = 'name,type\n"Foo, Inc",bar';
      expect(service.parse(csv)[0].name).toBe('Foo, Inc');
    });
  });

  describe('serialize', () => {
    it('produces header row and data rows', () => {
      const result = service.serialize(
        [{ name: 'Foo', type: 'bar' }],
        ['name', 'type'],
      );
      expect(result).toBe('name,type\nFoo,bar');
    });

    it('quotes values containing commas', () => {
      const result = service.serialize(
        [{ name: 'Foo, Inc', type: 'bar' }],
        ['name', 'type'],
      );
      expect(result).toContain('"Foo, Inc"');
    });

    it('converts null and undefined to empty string', () => {
      const result = service.serialize(
        [{ name: null, type: undefined }] as any,
        ['name', 'type'],
      );
      expect(result).toBe('name,type\n,');
    });

    it('serializes boolean and number values as strings', () => {
      const result = service.serialize(
        [{ active: true, count: 42 }] as any,
        ['active', 'count'],
      );
      expect(result).toBe('active,count\ntrue,42');
    });
  });
});
