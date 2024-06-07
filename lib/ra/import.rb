require 'csv'
require 'json'

require 'faraday'
require 'roo'
require 'kramdown'

begin
  require 'pry'
rescue LoadError => e
end

class Ra::Import
  def run
    translations

    records
    coordinates
    images

    verify
    unify

    statics

    # binding.pry
  end

  def sets
    return [
      {sheet: 'artworks_Argenville', slug: 'argenville'},
      {sheet: 'artworks_Guérin', slug: 'guerin'}
    ]
  end

  def statics
    system 'cp', '-f', 'data/data.xlsx', 'public/data.xlsx'
  end

  def verify
    @records.each do |id, r|
      record = {'id' => id}

      skip = [
        'check_sofya',
        'room_academie_1781',
        'room_academie_additional_information_1781',
        'order_par_room',
        'description_unident_pieces'
      ]

      if r['argenville'] && r['guerin']
        keys = r.values.map{|v| v.keys}.flatten.uniq - skip
        keys.each do |k|
          av = r['argenville'][k]
          gv = r['guerin'][k]

          next if blank?(av)
          next if blank?(gv)
          next if av.is_a?(Hash)
          next if gv.is_a?(Hash)
          next if gv.is_a?(Array)

          if av != gv
            puts "record #{id} has argenville:#{k}=#{av} but guerin:#{k}=#{gv}"
          end
        end
      end
    end
  end

  def fetch(record, *keys)
    ['argenville', 'guerin'].each do |c|
      result = record[c]

      keys.each do |k|
        break if result.nil?
        result = result[k]
      end
      return result if result
    end

    nil
  end

  def fetch_room(r)
    result = {}

    if a = r['guerin']
      result[1715] = [
        a['room_academie_1715'],
        a['room_academie_additional_information_1715']
      ].compact
    end

    if a = r['argenville']
      result[1781] = [
        a['room_academie_1781'],
        a['room_academie_additional_information_1781']
      ].compact
    end

    result
  end

  def fetch_image(r, id)
    path = "/default/#{r.keys.first}.#{id}.jpg"
    return nil unless File.exist?("data/images.normalized/#{path}")

    "/images#{path}"
  end

  def fetch_study(r)
    ['argenville', 'guerin'].each do |s|
      next unless r[s]

      if r[s]['study']
        id = r[s]['id_artwork']

        link = r[s]['study_link']
        en = r[s]['study'].gsub(/© (.*)$/, "© <a href=\"#{link}\" target=\"_blank\">\\1</a>")
        fr = r[s]['study_fr'].gsub(/© (.*)$/, "© <a href=\"#{link}\" target=\"_blank\">\\1</a>")

        return {
          'en' => en,
          'fr' => fr,
          'image' => "/images/study/#{s}.#{id}.jpg"
        }
      end
    end

    nil
  end

  def fetch_copy(r)
    ['argenville', 'guerin'].each do |s|
      next unless r[s]

      if r[s]['print_copy']
        id = r[s]['id_artwork']

        link = r[s]['print_copy_link']
        en = r[s]['print_copy'].gsub(/© (.*)$/, "© <a href=\"#{link}\" target=\"_blank\">\\1</a>")
        fr = r[s]['print_copy_fr'].gsub(/© (.*)$/, "© <a href=\"#{link}\" target=\"_blank\">\\1</a>")

        return {
          'en' => en,
          'fr' => fr,
          'image' => "/images/copy/#{s}.#{id}.jpg"
        }
      end
    end

    nil
  end

  def fetch_original(r)
    ['argenville', 'guerin'].each do |s|
      next unless r[s]

      if r[s]['orig_sculpt']
        id = r[s]['id_artwork']

        link = r[s]['orig_sculpt_link']
        en = r[s]['orig_sculpt'].gsub(/© (.*)$/, "© <a href=\"#{link}\" target=\"_blank\">\\1</a>")
        fr = r[s]['orig_sculpt_fr'].gsub(/© (.*)$/, "© <a href=\"#{link}\" target=\"_blank\">\\1</a>")

        return {
          'en' => en,
          'fr' => fr,
          'image' => "/images/original/#{s}.#{id}.jpg"
        }
      end
    end

    nil
  end

  def apply_40027(r, id)
    return unless id == 40027
    
    letters = ('a'..'z').to_a + ['zz']

    r['image'] = "/images/guerin.40027a.jpg"
    r['additional_images'] = letters.map{|l| "/images/guerin.40027#{l}.jpg"}
  end

  def fetch_inventories(r)
    results = []

    results << '1715' if r.keys.include?('guerin')
    results << '1781' if r.keys.include?('argenville')

    results
  end

  def fetch_inventory_no(r)
    numbers = fetch(r, 'accession_number_artwork')
    links = fetch(r, 'collection_link')
    return [] if !numbers || !links

    numbers = numbers.to_s.split(/\s*;\s*/)
    links = links.split(/\s*;\s*/)

    numbers.zip(links)
  end

  def fetch_notes(r)
    ['argenville', 'guerin'].map do |s|
      next unless r[s]

      en = [r[s]['note_1_en'], r[s]['note_2_en'], r[s]['note_3_en']]
      fr = [r[s]['note_1_fr'], r[s]['note_2_fr'], r[s]['note_3_fr']]

      return {
        'en' => en.compact,
        'fr' => fr.compact
      }
    end

    nil
  end

  def fetch_type(r)
    types = []

    ['argenville', 'guerin'].map do |s|
      next unless r[s]
      next unless r[s]['type']

      return {
        'en' => r[s]['type']['type'],
        'fr' => r[s]['type']['type French']
      }
    end

    {}
  end

  def fetch_descs(r)
    results = ['guerin', 'argenville'].map do |s|
      next unless r[s]
      r[s]['description_unident_pieces']
    end

    results.compact
  end

  def fetch_acquisition_date(r)
    results = ['argenville', 'guerin'].map do |s|
      next unless r[s]
      id = r[s]['id_artwork']

      date = r[s]['acquisition_date'].to_s.strip
      next unless date
      next if date == ''

      if m = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
        drop, day, month, year = m.to_a

        # p [day, month, year]
        next {date: [year.to_i, month.to_i, day.to_i]}
      end

      if m = date.match(/^(\d{4})$/)
        drop, year = m.to_a

        next {year: year.to_i}
      end

      if m = date.match(/^(\d{4})-(\d{4})$/)
        drop, from, to = m.to_a

        # p [from, to]
        next {year_range: [from.to_i, to.to_i]}
      end

      p [s, id, date]
      # binding.pry

      next nil
    end

    if results.compact.size > 1
      binding.pry
    end

    results.compact.first
  end

  def unify
    @unified = []

    @records.each do |id, r|
      record = {
        'id' => id,
        'title' => {
          'en' => fetch(r, 'title_english'),
          'fr' => fetch(r, 'title_french')
        },
        'inventories' => fetch_inventories(r),
        'image' => fetch_image(r, id),
        'credits' => fetch(r, 'image_credits'),
        'type' => fetch_type(r),
        'biblio' => r.values.map{|v| v['biblio']}.flatten.compact.sort_by{|e|
          weights = {
            1090 => 10,
            1050 => 20,
            1060 => 2000
          }

          weights[e['id']] || e['id']
        },
        'technique' => {
          'en' => fetch(r, 'technique', 'technique'),
          'fr' => fetch(r, 'technique', 'technique French')
        },
        'medium' => {
          'en' => fetch(r, 'medium', 'medium'),
          'fr' => fetch(r, 'medium', 'medium French')
        },
        'collection' => {
          'en' => fetch(r, 'collection'),
          'fr' => t(fetch(r, 'collection') || fetch(r, 'collection'))
        },
        'artists' => fetch(r, 'artists').map{|a| a['artist family name']},
        'artists_human' => {
          'en' => fetch(r, 'artists').map{|a| a['artist French'] || a['artist']},
          'fr' => fetch(r, 'artists').map{|a| a['artist']}
        },
        'artists_wikidata' => fetch(r, 'artists').map{|a| a['Wikidata_ID']}.compact,
        'artists_ulan' => fetch(r, 'artists').map{|a| a['ULAN_ID']}.compact,
        'after_other_artist' => fetch(r, 'after_other_artist'),
        'dims_human' => fetch(r, 'measurements_artwork'),
        'dims' => fetch(r, 'dims'),
        'area' => to_area(fetch(r, 'measurements_artwork')),
        'orientation' => to_orientation(fetch(r, 'measurements_artwork')),
        'date' => fetch(r, 'date_artwork'),
        'collection_link' => fetch(r, 'collection_link'),
        'location' => fetch(r, 'current_location_artwork'),
        'inventory_no' => fetch_inventory_no(r),
        'room' => fetch_room(r),
        'study' => fetch_study(r),
        'copy' => fetch_copy(r),
        'original' => fetch_original(r),
        'notes' => fetch_notes(r),
        'plate_link' => fetch(r, 'plate_link'),
        'description_unident' => fetch_descs(r),
        'acquisition_date' => fetch_acquisition_date(r)
      }

      apply_40027(record, id)

      @unified << record.compact
    end

    File.open 'public/unified.json', 'w' do |f|
      f.write JSON.pretty_generate(@unified)
    end
  end

  def records
    xlsx = Roo::Spreadsheet.open('data/data.xlsx')

    bib = {}
    each_row xlsx, 'Bibliography', 0 do |row|
      id = row['ID'].to_i
      bib[id] = row
    end

    artists = {}
    each_row xlsx, 'artists', 0 do |row|
      id = row['ID'].to_i
      artists[id] = row
    end

    media = {}
    each_row xlsx, 'medium', 0 do |row|
      id = row['ID'].to_i
      media[id] = row
    end

    # collections = {}
    # each_row xlsx, 'collections', 0 do |row|
    #   id = row['id'].to_i
    #   collections[id] = row
    # end

    techniques = {}
    each_row xlsx, 'technique', 0 do |row|
      id = row['ID'].to_i
      techniques[id] = row
    end

    types = {}
    each_row xlsx, 'type', 0 do |row|
      id = row['ID'].to_i
      types[id] = row
    end


    @records = {}

    sets.each do |s|
      each_row xlsx, s[:sheet] do |row|
        row['id_artwork'] = row['id_artwork'].to_i

        record_id = row['id_artwork']
        @records[record_id] ||= {}

        if id = to_id(row["id_biblio_#{s[:slug]}"])
          row['biblio'] = bib[id]
          binding.pry unless row['biblio']
        end

        row['biblio'] = []
        row.keys.each do |k|
          next unless k.match?(/^id__?biblio/)
          
          id = to_id(row[k])
          next unless id

          pages = k.
            sub(/^id__?biblio_/, 'pages_biblio_').
            sub('argenville', 'Argenville')

          binding.pry if blank?(row[pages])

          canvas_key = k.sub(/^id__?biblio_/, 'iiif_canvas_link_')
          canvas_id = row[canvas_key]

          row['biblio'] << {
            'id' => id,
            'pages' => row[pages],
            'canvas_id' => canvas_id,
            'biblio' => bib[id]
          }.compact
          # puts row['id_artwork'] if row[manifest]
        end

        artist_ids = [to_id(row['artist_1_id']), to_id(row['artist_2_id'])].compact
        row['artists'] = artist_ids.map{|id| artists[id]}.compact
        binding.pry if artist_ids.size > row['artists'].size

        if id = to_id(row['id_medium_artwork'])
          row['medium'] = media[id]
          binding.pry unless row['medium']
        end

        # if id = to_id(row['id_collection_norm'])
        #   row['collection'] = collections[id]
        #   binding.pry unless row['collection']
        # end
        row['collection'] = row['current_location_artwork']

        if id = to_id(row['id_technique_artwork'])
          row['technique'] = techniques[id]
          binding.pry unless row['technique']
        end

        if id = to_id(row['id_type_artwork'])
          row['type'] = types[id]
          binding.pry unless row['type']
        end

        row['dims'] = to_dims(row['measurements_artwork'])

        @records[record_id][s[:slug]] = row
      end
    end

    File.open 'public/records.json', 'w' do |f|
      f.write JSON.pretty_generate(@records)
    end
  end

  def coordinates
    file = 'data/coordinates.xlsx'
    xlsx = Roo::Spreadsheet.open(file)
    results = {}

    each_row xlsx do |row|
      next unless row['coordinates']
      
      row['coordinates'] = row['coordinates'].split(',').map{|c| c.to_f}
      results[row['current_location']] = row
    end

    File.open 'public/coordinates.json', 'w' do |f|
      f.write JSON.pretty_generate(results)
    end
  end

  def images
    system 'mkdir', '-p', 'data/images.normalized'
    Dir['data/images.sofya/**/*.*'].each do |f|
      ext = f.split('.').last.downcase
      next unless ['jpg', 'jpeg', 'png'].include?(ext)

      parts = f.split('/').last.split('.')
      parts.insert 1, 'default' if parts.size == 3
      inventory, tier, id, ext = parts
      # id = id.to_i

      target = "data/images.normalized/#{tier}/#{inventory}.#{id}.jpg"
      dir = File.dirname(target)
      unless File.exist?(target)
        system 'mkdir', '-p', dir
        system 'magick', f, '-resize', '1280x1280>', target
      end

      target = "data/images.normalized.640/#{tier}/#{inventory}.#{id}.jpg"
      dir = File.dirname(target)
      unless File.exist?(target)
        system 'mkdir', '-p', dir
        system 'magick', f, '-resize', '640x640>', target
      end
    end

    system 'rsync', '-a', 'data/images.normalized/', 'public/images'
    system 'rsync', '-a', 'data/images.normalized.640/', 'public/images.640/'
    system 'rsync', '-a', 'data/help/', 'public/help/'
  end

  def t(key)
    @translations['fr'][key] || key
  end

  def translations
    data = {}

    Dir['data/translations.*.xlsx'].each do |file|
      puts "using translations from #{file}"

      xlsx = Roo::Spreadsheet.open(file)

      each_row xlsx do |row|
        id = row.delete('id')

        row.each do |locale, v|
          data[locale] ||= {}

          if id.match(/^help_/)
            v = Kramdown::Document.new(v).to_html
          end

          data[locale][id] = v
        end
      end
    end

    File.open 'public/translations.json', 'w' do |f|
      f.write JSON.pretty_generate(data)
    end

    @translations = data
  end


  protected

    def to_dims(value)
      return nil if blank?(value)
      
      value.scan(/[0-9\.]+/).map(&:to_f)
    end

    def to_orientation(value)
      return 'unknown' if blank?(value)

      strs = to_dims(value)

      strs.first > strs.last ? 'portrait' : 'landscape'
    end

    def to_area(value)
      return -1 if blank?(value)

      strs = to_dims(value)
      strs.first * strs.last
    end

    def blank?(value)
      return [nil, "", 0, [], {}].include?(value)
    end

    def present?(value)
      !blank?(value)
    end

    def presence(value)
      present?(value) ? value : nil
    end

    def to_id(value)
      return nil if blank?(value)

      value.to_i
    end

    def each_row(xlsx, sheet_name = nil, skip = 1, &block)
      sheet = (sheet_name ? xlsx.sheet_for(sheet_name) : xlsx.sheet(0))
      headers = sheet.row(skip + 1)

      ((skip + 2)..sheet.last_row).each do |i|
        row = headers.zip(sheet.row(i)).to_h.compact

        yield row
      end
    end

    def scraper
      @scraper ||= ::Ra::Scraper.new
    end

    def dfk_persons
      @dfk_persons ||= begin
        response = Faraday.get('https://static.dfkg.org/dfk_persons/entities.json')
        data = JSON.parse(response.body)

        lookup = {}
        data['records'].each do |record|
          qid = record['wikidata_id']
          next unless qid

          lookup[qid] = record
        end
        lookup
      end
    end
end