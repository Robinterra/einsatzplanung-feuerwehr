using System.ComponentModel;
using System.Data;
using System.Reflection;
using Dapper;
using MySqlConnector;

public class Program
{
    public static void Main(string[] args)
    {
        //Migrate<auth_trusted_devices>();
        //Migrate<members>();
        //Migrate<trainings>();
        //Migrate<vehicles>();
        //Migrate<vehicle_seats>();
        //Migrate<auth_entities>();
        //Migrate<member_training_logs>();
        //Migrate<vehicle_instruction_logs>();
    }

    public static void Migrate<T>() where T : class, new()
    {
        string tableName = typeof(T).Name;
        List<string> dataRecords = File.ReadAllLines($"/pro/uni/teamporjekt/einsatzplanung-feuerwehr/db_data/{tableName}.csv", System.Text.Encoding.UTF8).ToList();

        IEnumerable<T> records = DeserializeCSV<T>(dataRecords);

        ConnectionInformationMariaDb connectionInfo = new ConnectionInformationMariaDb("Server=127.0.1.1;Database=feuerwehr;User ID=root;Password=root;SslMode=none;");
        SqlCRUD sqlCRUD = new SqlCRUD(connectionInfo);

        foreach (var record in records)
        {
            sqlCRUD.InsertTableData(tableName, record).Wait();
        }

        Console.WriteLine($"Inserted {records.Count()} records into table {tableName}.");
    }

    public static IEnumerable<T> DeserializeCSV<T>(List<string> dataRecords, string delimiter = ",") where T : class, new()
    {
        PropertyInfo[] properties = typeof(T).GetProperties();
        foreach (var record in dataRecords)
        {
            T recordInstance = new T();
            ReadOnlySpan<char> recordSpan = record.AsSpan();
            int i = 0;
            foreach (var chunk in recordSpan.Split(delimiter))
            {
                object? currentValue = ConvertToType(recordSpan[chunk], properties[i].PropertyType);
                properties[i].SetValue(recordInstance, currentValue);

                i++;
            }
            yield return recordInstance;
        }
    }

    public static object? ConvertToType(ReadOnlySpan<char> value, Type targetType)
    {
        if (targetType == typeof(string))
        {
            string res = value.ToString();
            if (string.IsNullOrEmpty(res)) return null;
            return res;
        }
        else if (targetType == typeof(int))
        {
            return int.TryParse(value, out int intValue) ? intValue : null;
        }
        else if (targetType == typeof(double))
        {
            return double.TryParse(value, out double doubleValue) ? doubleValue : null;
        }
        else if (targetType == typeof(bool))
        {
            bool? valueRet = bool.TryParse(value, out bool boolValue) ? boolValue : null;
            if (valueRet is bool b) return b;

            return value.Equals("1", StringComparison.OrdinalIgnoreCase);
        }
        else if (targetType == typeof(DateTime))
        {
            return DateTime.TryParse(value, out DateTime dateTimeValue) ? dateTimeValue : null;
        }
        else
        {
            throw new NotSupportedException($"Conversion to type {targetType.Name} is not supported.");
        }
    }

}

public class auth_trusted_devices
{
    public auth_trusted_devices()
    {

    }

    [Order(1)]
    public string? Id { get; set; }
    [Order(2)]
    public string? Name { get; set; }
    [Order(3)]
    public string? Description { get; set; }
    [Order(4)]
    public string? Hash { get; set; }
    [Order(5)]
    public DateTime Created_at { get; set; }
    [Order(6)]
    public string? Created_by { get; set; }
}

public class members
{
    public members()
    {

    }

    [Order(1)]
    public string? id { get; set; }
    [Order(2)]
    public string? first_name { get; set; }
    [Order(3)]
    public string? last_name { get; set; }
    [Order(4)]
    public string? feueron_nr { get; set; }
    [Order(5)]
    public int personnel_nr { get; set; }
    [Order(6)]
    public DateTime birthdate { get; set; }
    [Order(7)]
    public string? gender { get; set; }
    [Order(8)]
    public string? iserv_username { get; set; }
    [Order(9)]
    public int divera_id { get; set; }
    [Order(10)]
    public string? image_url { get; set; }
    [Order(11)]
    public DateTime modified_at { get; set; }
    [Order(12)]
    public string? department { get; set; }
    [Order(13)]
    public string? created_by { get; set; }
    [Order(14)]
    public string? status { get; set; }
    [Order(15)]
    public string? entity_created_id { get; set; }
}

public class trainings
{
    public trainings()
    {

    }

    [Order(1)]
    public string? id { get; set; }
    [Order(2)]
    public string? name { get; set; }
    [Order(3)]
    public string? key { get; set; }
    [Order(4)]
    public string? type { get; set; }
    [Order(5)]
    public string? color { get; set; }
    [Order(6)]
    public string? Ref { get; set; }
}

public class vehicles
{
    public vehicles()
    {

    }

    [Order(1)]
    public string? id { get; set; }
    [Order(2)]
    public string? name { get; set; }
    [Order(3)]
    public string? abbreviation { get; set; }
    [Order(4)]
    public string? opta { get; set; }
    [Order(5)]
    public string? license_plate { get; set; }
    [Order(6)]
    public string? image { get; set; }
    [Order(7)]
    public bool needs_instruction { get; set; }
    [Order(8)]
    public bool driver_cab { get; set; }
    [Order(9)]
    public bool crew_cab { get; set; }
    [Order(10)]
    public bool seat_front { get; set; }
    [Order(11)]
    public bool seat_back { get; set; }
    [Order(12)]
    public bool G1 { get; set; }
    [Order(13)]
    public bool G2 { get; set; }
    [Order(14)]
    public bool G3 { get; set; }
    [Order(15)]
    public bool G4 { get; set; }
    [Order(16)]
    public bool G5 { get; set; }
    [Order(17)]
    public bool G6 { get; set; }
    [Order(18)]
    public bool back { get; set; }
    [Order(19)]
    public bool top { get; set; }
}

public class vehicle_seats
{
    public vehicle_seats()
    {

    }

    [Order(1)]
    public string? id { get; set; }
    [Order(2)]
    public string? vehicle_id { get; set; }
    [Order(3)]
    public bool agt { get; set; }
    [Order(4)]
    public string? seat { get; set; }
    [Order(5)]
    public string? leadership { get; set; }
}

public class auth_entities
{
    public auth_entities()
    {

    }

    [Order(1)]
    public string? id { get; set; }
    [Order(2)]
    public string? member_id { get; set; }
    [Order(3)]
    public string? group_id { get; set; }
    [Order(4)]
    public string? api_access_id { get; set; }
    [Order(5)]
    public string? device_id { get; set; }
    [Order(6)]
    public string? profile_id { get; set; }
    [Order(7)]
    public string? fallback_title { get; set; }
}

public class member_training_logs
{
    public member_training_logs()
    {

    }

    [Order(1)]
    public string? id { get; set; }
    [Order(2)]
    public string? member_id { get; set; }
    [Order(3)]
    public string? training_id { get; set; }
    [Order(4)]
    public string? status { get; set; }
    [Order(5)]
    public DateTime timestamp { get; set; }
    [Order(6)]
    public string? entity_created_id { get; set; }
    [Order(7)]
    public DateTime expiration { get; set; }
    [Order(8)]
    public string? source { get; set; }
}

public class vehicle_instruction_logs
{
    public vehicle_instruction_logs()
    {

    }

    [Order(1)]
    public string? id { get; set; }
    [Order(2)]
    public string? vehicle_id { get; set; }
    [Order(3)]
    public string? member_id { get; set; }
    [Order(4)]
    public DateTime created_at { get; set; }
    [Order(5)]
    public bool instructed { get; set; }
    [Order(6)]
    public DateTime suspended_until { get; set; }
    [Order(7)]
    public string? created_by_entity_id { get; set; }
}

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field, 
    Inherited = true, AllowMultiple = false)]
[ImmutableObject(true)]
public sealed class OrderAttribute : Attribute {
    private readonly int order;
    public int Order { get { return order; } }
    public OrderAttribute(int order) {this.order = order;}
}

public interface IConnectionInformationDapper
{

    #region methods

    IDbConnection BuildConnection();

    #endregion methods

}

public class ConnectionInformationMariaDb : IConnectionInformationDapper
{

    #region get/set

    public string ConnectionString
    {
        get;
    }

    #endregion get/set

    #region ctor

    public ConnectionInformationMariaDb(string connectionString)
    {
        this.ConnectionString = connectionString;
    }

    #endregion ctor

    #region methods

    public IDbConnection BuildConnection()
    {
        return new MySqlConnection(this.ConnectionString);
    }

    #endregion methods

}

public class SqlCRUD
{
    //56:14
    #region vars

    private readonly IConnectionInformationDapper info;

    #endregion vars

    #region ctor

    public SqlCRUD(IConnectionInformationDapper info)
    {
        this.info = info;
    }

    #endregion ctor

    #region methods

    public async Task<IEnumerable<T>> LoadData<T>(string storedProcedure, object? param = null)
    {
        using IDbConnection connection = info.BuildConnection();

        return await connection.QueryAsync<T>(storedProcedure, param: param, commandType: CommandType.StoredProcedure);
    }

    public async Task<IEnumerable<T>> QueryData<T>(string sqlquery, object? param = null)
    {
        using IDbConnection connection = info.BuildConnection();

        return await connection.QueryAsync<T>(sqlquery, param: param, commandType: CommandType.Text);
    }

    public async Task SaveData<T>(string storedProcedure, T param)
    {
        using IDbConnection connection = info.BuildConnection();

        await connection.ExecuteAsync(storedProcedure, param: param, commandType: CommandType.StoredProcedure);
    }

    public async Task InsertTableData<T>(string table, T data)
    {
        using IDbConnection connection = info.BuildConnection();

        string sqlQuery = $"INSERT INTO {table} ({string.Join(", ", typeof(T).GetProperties().Select(p => $"`{p.Name}`"))}) VALUES ({string.Join(", ", typeof(T).GetProperties().Select(p => "@" + p.Name))})";

        await connection.ExecuteAsync(sqlQuery, param: data, commandType: CommandType.Text);
    }

    public async Task<TResponse> InsertData<TRequest, TResponse>(string storedProcedure, TRequest param)
    {
        using IDbConnection connection = info.BuildConnection();

        IEnumerable<TResponse> response = await connection.QueryAsync<TResponse>(storedProcedure, param: param, commandType: CommandType.StoredProcedure);

        return response.First();
    }

    #endregion methods

}

